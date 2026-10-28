/*
 * Link previews for products, categories and departments.
 *
 * WhatsApp, Facebook, Instagram, X and search engines read a page's <meta> tags
 * without running JavaScript, so a shared product link would otherwise show the
 * home page preview. For those crawlers this fills in the real name, description,
 * price and photo from the database, and answers 404 for a product or category that
 * doesn't exist so it isn't indexed. Visitors' browsers are passed straight through.
 */
const CRAWLERS = /facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|instagram|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|skypeuripreview|viber|snapchat|tiktok|redditbot|embedly|googlebot|bingbot|applebot|duckduckbot|yandex/i;
const BURST = "https://burst.shopifycdn.com/photos";

const escape = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const shorten = (text, max = 180) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : clean;
};

const rupees = (amount) => `Rs. ${Number(amount || 0).toLocaleString("en-US")}`;

/* Same rule as src/lib/images.js: a Burst slug or a full/relative URL. */
function imageUrl(value, origin) {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${origin}${value}`;
  return `${BURST}/${value}.jpg?width=1200&format=pjpg&exif=0&iptc=0`;
}

/* The matching row, MISSING when there is no such visible row, or null when the database can't be asked. */
const MISSING = { missing: true };
async function fetchRow(table, filter, select) {
  const base = Netlify.env.get("VITE_SUPABASE_URL");
  const key = Netlify.env.get("VITE_SUPABASE_ANON_KEY");
  if (!base || !key) return null;
  const response = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${table}?${filter}&select=${select}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0] || MISSING;
}

async function describe(kind, slug, origin) {
  const id = encodeURIComponent(slug);
  if (kind === "product") {
    const row = await fetchRow("products", `slug=eq.${id}&active=eq.true`, "name,description,price,images,brands(name)");
    if (!row || row === MISSING) return row;
    const brand = row.brands?.name;
    return {
      title: `${row.name}${brand ? ` by ${brand}` : ""} · ${rupees(row.price)}`,
      description: shorten(row.description) || `${row.name}, delivered across Pakistan.`,
      image: imageUrl(row.images?.[0], origin),
      type: "product",
      price: row.price,
    };
  }
  const table = kind === "shop" ? "categories" : "departments";
  const row = await fetchRow(table, `id=eq.${id}&active=eq.true`, "name,tagline,description,image");
  if (!row || row === MISSING) return row;
  return {
    title: `${row.name} · Shop online in Pakistan`,
    description: shorten(row.description || row.tagline) || `${row.name}, delivered across Pakistan.`,
    image: imageUrl(row.image, origin),
    type: "website",
  };
}

/* Replaces a tag matched by `pattern`, or adds `tag` before </head> when the page doesn't have it. */
function put(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

const metaPattern = (attribute, name) => new RegExp(`<meta\\s+${attribute}="${name.replace(/[:]/g, "\\:")}"[^>]*>`);

export default async (request, context) => {
  if (!CRAWLERS.test(request.headers.get("user-agent") || "")) return;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/(product|shop|department)\/([^/]+)\/?$/);
  if (!match) return;

  let info = null;
  try {
    info = await describe(match[1], decodeURIComponent(match[2]), url.origin);
  } catch {
    info = null;
  }
  const response = await context.next();
  if (!info || !(response.headers.get("content-type") || "").includes("text/html")) return response;

  if (info === MISSING) {
    const page = put(await response.text(), metaPattern("name", "robots"), `<meta name="robots" content="noindex" />`);
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(page, { status: 404, headers });
  }

  const siteName = "Naz & CO";
  const pageUrl = `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  const title = `${info.title} | ${siteName}`;
  let html = await response.text();

  html = put(html, /<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
  html = put(html, metaPattern("name", "description"), `<meta name="description" content="${escape(info.description)}" />`);
  html = put(html, /<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${escape(pageUrl)}" />`);
  html = put(html, metaPattern("property", "og:type"), `<meta property="og:type" content="${info.type}" />`);
  html = put(html, metaPattern("property", "og:title"), `<meta property="og:title" content="${escape(info.title)}" />`);
  html = put(html, metaPattern("property", "og:description"), `<meta property="og:description" content="${escape(info.description)}" />`);
  html = put(html, metaPattern("property", "og:url"), `<meta property="og:url" content="${escape(pageUrl)}" />`);
  html = put(html, metaPattern("name", "twitter:title"), `<meta name="twitter:title" content="${escape(info.title)}" />`);
  html = put(html, metaPattern("name", "twitter:description"), `<meta name="twitter:description" content="${escape(info.description)}" />`);
  if (info.image) {
    html = put(html, metaPattern("property", "og:image"), `<meta property="og:image" content="${escape(info.image)}" />`);
    html = put(html, metaPattern("name", "twitter:image"), `<meta name="twitter:image" content="${escape(info.image)}" />`);
    /* The default image's size no longer applies. */
    html = html.replace(metaPattern("property", "og:image:width"), "").replace(metaPattern("property", "og:image:height"), "");
  }
  if (info.price) {
    html = put(html, metaPattern("property", "product:price:amount"), `<meta property="product:price:amount" content="${info.price}" />`);
    html = put(html, metaPattern("property", "product:price:currency"), `<meta property="product:price:currency" content="PKR" />`);
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(html, { status: response.status, headers });
};

export const config = { path: ["/product/*", "/shop/*", "/department/*"] };

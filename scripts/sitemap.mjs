/* Generates public/sitemap.xml and public/robots.txt (runs automatically before every build).
 * Products, categories and departments come from the live database, so items added or hidden
 * in the admin are reflected. Categories and departments with no products yet are left out. */
import { readFileSync, existsSync, writeFileSync } from "node:fs";

/* Netlify passes its variables in the environment; locally they live in .env. */
if (existsSync(".env")) {
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    });
}

/* VITE_SITE_URL when a domain is set; otherwise the address Netlify gives the site (URL). */
const base = (process.env.VITE_SITE_URL || process.env.URL || "http://localhost:5173").replace(/\/+$/, "");
const today = new Date().toISOString().slice(0, 10);

async function liveCatalogue() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const get = async (path) => {
    const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  };
  try {
    const [departments, categories, products] = await Promise.all([
      get("departments?select=id&active=eq.true&order=sort_order"),
      get("categories?select=id,department&active=eq.true&order=sort_order"),
      get("products?select=slug,category_id,updated_at&active=eq.true&order=created_at"),
    ]);
    const departmentIds = new Set(departments.map((row) => row.id));
    const visibleCategories = categories.filter((row) => departmentIds.has(row.department));
    const categoryIds = new Set(visibleCategories.map((row) => row.id));
    const visibleProducts = products.filter((row) => categoryIds.has(row.category_id));
    const stocked = visibleCategories.filter((row) => visibleProducts.some((product) => product.category_id === row.id));
    return {
      departments: departments.filter((row) => stocked.some((category) => category.department === row.id)).map((row) => row.id),
      categories: stocked.map((row) => row.id),
      products: visibleProducts.map((row) => ({ slug: row.slug, lastmod: row.updated_at?.slice(0, 10) })),
    };
  } catch (error) {
    console.warn(`sitemap: could not read the database (${error.message}); listing the fixed pages only.`);
    return null;
  }
}

const live = await liveCatalogue();
const catalogue = live || { departments: [], categories: [], products: [] };

const entries = [
  ["/", "daily", 1.0],
  ["/shop", "daily", 0.9],
  ...catalogue.departments.map((id) => [`/department/${id}`, "weekly", 0.8]),
  ...catalogue.categories.map((slug) => [`/shop/${slug}`, "weekly", 0.8]),
  ["/new-arrivals", "weekly", 0.7],
  ["/best-sellers", "weekly", 0.7],
  ...catalogue.products.map((product) => [`/product/${product.slug}`, "weekly", 0.7, product.lastmod]),
  ["/about", "monthly", 0.5],
  ["/contact", "monthly", 0.5],
  ["/faq", "monthly", 0.5],
  ["/track-order", "monthly", 0.4],
  ["/payment-policy", "yearly", 0.4],
  ["/shipping-policy", "yearly", 0.3],
  ["/returns", "yearly", 0.3],
  ["/privacy-policy", "yearly", 0.3],
  ["/terms", "yearly", 0.3],
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(([path, freq, priority, lastmod]) => `  <url><loc>${base}${path}</loc><lastmod>${lastmod || today}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync("public/sitemap.xml", xml);

const robots = `User-agent: *
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /order/
Disallow: /account
Disallow: /wishlist
Disallow: /compare
Disallow: /search
Disallow: /admin

Sitemap: ${base}/sitemap.xml
`;
writeFileSync("public/robots.txt", robots);
console.log(`sitemap.xml: ${entries.length} URLs${live ? " from the database" : ""} (${base})`);

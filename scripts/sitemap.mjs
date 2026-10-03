/* Generates public/sitemap.xml and public/robots.txt from the catalogue (runs automatically before every build). */
import { writeFileSync } from "node:fs";
import { products } from "../src/data/products.js";
import { categories } from "../src/data/categories.js";
import { departments } from "../src/data/departments.js";

/* VITE_SITE_URL when a domain is set; otherwise the address Netlify gives the site (URL). */
const base = (process.env.VITE_SITE_URL || process.env.URL || "http://localhost:5173").replace(/\/+$/, "");
const today = new Date().toISOString().slice(0, 10);
const entries = [
  ["/", "daily", 1.0],
  ["/shop", "daily", 0.9],
  ...departments.map((department) => [`/department/${department.id}`, "weekly", 0.8]),
  ...categories.map((category) => [`/shop/${category.slug}`, "weekly", 0.8]),
  ["/new-arrivals", "weekly", 0.7],
  ["/best-sellers", "weekly", 0.7],
  ...products.map((product) => [`/product/${product.slug}`, "weekly", 0.7]),
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
${entries.map(([path, freq, priority]) => `  <url><loc>${base}${path}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`).join("\n")}
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
console.log(`sitemap.xml: ${entries.length} URLs (${base})`);

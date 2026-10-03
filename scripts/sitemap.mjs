/* Generates public/sitemap.xml from the catalogue (runs automatically before every build). */
import { writeFileSync } from "node:fs";
import { products } from "../src/data/products.js";
import { articles } from "../src/data/journal.js";
import { categories } from "../src/data/categories.js";

const base = process.env.VITE_SITE_URL || "https://naazandco.com";
const today = new Date().toISOString().slice(0, 10);
const entries = [
  ["/", "daily", 1.0],
  ["/shop", "daily", 0.9],
  ["/beauty", "weekly", 0.8],
  ...categories.map((category) => [`/shop/${category.slug}`, "weekly", 0.8]),
  ["/new-arrivals", "weekly", 0.7],
  ["/best-sellers", "weekly", 0.7],
  ["/sale", "weekly", 0.7],
  ...products.map((product) => [`/product/${product.slug}`, "weekly", 0.7]),
  ["/journal", "weekly", 0.6],
  ...articles.map((article) => [`/journal/${article.slug}`, "monthly", 0.5]),
  ["/about", "monthly", 0.5],
  ["/contact", "monthly", 0.5],
  ["/faq", "monthly", 0.5],
  ["/track-order", "monthly", 0.4],
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
console.log(`sitemap.xml: ${entries.length} URLs`);

/*
 * Seeds the Supabase database with the mock catalogue from src/data.
 * Idempotent: every table is upserted on its primary key.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
 * or put both in .env (never commit the service role key).
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { products } from "../src/data/products.js";
import { categories } from "../src/data/categories.js";
import { brands } from "../src/data/brands.js";
import { concerns } from "../src/data/concerns.js";
import { reviews } from "../src/data/reviews.js";
import { departments } from "../src/data/departments.js";
import { faqs } from "../src/data/faqs.js";
import { coupons, sampleOrders } from "../src/data/misc.js";

function loadEnv() {
  if (!existsSync(".env")) return;
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    });
}
loadEnv();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function upsert(table, rows, onConflict = "id") {
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`✓ ${table.padEnd(24)} ${rows.length} rows`);
}

const brandIdByName = Object.fromEntries(brands.map((brand) => [brand.name, brand.id]));

/*
 * Delivery, payment accounts and store details belong to the owner (Admin → Settings),
 * so a reseed leaves them alone. `--reset-settings` puts the sample values back.
 * The sample bank account is deliberately not a real one, and email and social
 * links start empty so the site never points at somebody else's address.
 */
const ownerSettings = [
  { key: "shipping", value: { free_shipping_threshold: 7000, shipping_fee: 250, estimated_days: "2 to 4 business days" } },
  { key: "store", value: { name: "Naz & CO", currency: "PKR", card_enabled: false } },
  { key: "payments", value: { advance_percent: 50, methods: [
    { id: "bank", label: "Bank Transfer", enabled: true, bank: "Meezan Bank", account_title: "Naz & CO", account_number: "PK00 MEZN 0000 0000 0000 0000" },
    { id: "easypaisa", label: "Easypaisa", enabled: false, bank: "", account_title: "", account_number: "" },
    { id: "jazzcash", label: "JazzCash", enabled: false, bank: "", account_title: "", account_number: "" },
  ] } },
  { key: "contact", value: { phone: "+92 300 1234567", whatsapp: "923001234567", email: "", hours: "Mon to Sat, 10am to 8pm PKT", address: "Suite 4, Bukhari Commercial, DHA Phase 6, Karachi, Pakistan", instagram: "", facebook: "", tiktok: "", youtube: "", announcement: "" } },
];
if (process.argv.includes("--reset-settings")) {
  await upsert("settings", ownerSettings, "key");
} else {
  const { error } = await db.from("settings").upsert(ownerSettings, { onConflict: "key", ignoreDuplicates: true });
  if (error) throw new Error(`settings: ${error.message}`);
  console.log("✓ settings                 kept as they are (use --reset-settings to restore the samples)");
}

await upsert("departments", departments.map((department, index) => ({ id: department.id, name: department.name, tagline: department.tagline, description: department.description, image: department.image, sort_order: index, active: true })));

await upsert("brands", brands.map((brand) => ({ id: brand.id, name: brand.name, tagline: brand.tagline, description: brand.description, featured: brand.featured, active: true })));

await upsert("categories", categories.map((category, index) => ({
  id: category.slug, department: category.department, name: category.name, tagline: category.tagline, description: category.description, image: category.image, subcategories: category.subcategories, sort_order: index, active: true,
})));

await upsert("concerns", concerns.map((concern, index) => ({ id: concern.id, name: concern.name, description: concern.description, image: concern.image, sort_order: index })));

await upsert("products", products.map((product) => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  slug: product.slug,
  brand_id: brandIdByName[product.brand],
  category_id: product.category,
  subcategory: product.subcategory,
  price: product.price,
  compare_at_price: product.compareAtPrice || null,

  images: product.images,
  description: product.description,
  benefits: product.benefits,
  ingredients: product.ingredients || [],
  how_to_use: product.howToUse || null,
  size: product.size,
  stock: product.stock,
  rating: product.rating,
  review_count: product.reviewCount,
  tags: product.tags,
  concerns: product.concerns || [],
  variants: product.variants || null,
  specs: product.specs || [],
  warranty: product.warranty || null,
  featured: product.featured,
  best_seller: product.bestSeller,
  new_arrival: product.newArrival,
  active: true,
})));

await upsert("product_costs", products.map((product) => ({ product_id: product.id, cost: Math.round(product.price * 0.55) })), "product_id");

await upsert("reviews", reviews.map((review) => ({
  id: review.id,
  product_id: review.productId,
  author: review.author,
  city: review.city,
  rating: review.rating,
  title: review.title,
  body: review.body,
  photo: review.photo || null,
  verified: review.verified,
  helpful: review.helpful,
  status: "approved",
  created_at: new Date(review.date).toISOString(),
})));

/* Approving reviews recalculates a product's rating; restore the seeded display numbers for the demo catalogue. */
await upsert("products", products.map((product) => ({ id: product.id, sku: product.sku, name: product.name, slug: product.slug, price: product.price, rating: product.rating, review_count: product.reviewCount })));

const faqRows = faqs.flatMap((group, groupIndex) => group.items.map((item, index) => ({ id: groupIndex * 100 + index + 1, category: group.category, question: item.question, answer: item.answer, sort_order: groupIndex * 100 + index, active: true })));
await upsert("faqs", faqRows);
/* FAQs are only edited here, so rows that are no longer in the file are removed. */
await db.from("faqs").delete().not("id", "in", `(${faqRows.map((row) => row.id).join(",")})`);

await upsert("coupons", coupons.map((coupon) => ({ code: coupon.code, type: coupon.type, value: coupon.value, min_order: coupon.minOrder, description: coupon.description, creator_id: coupon.creatorId, active: true })), "code");

/* Sample orders so Track Order and the demo tip work in live mode. */
const productBySlug = Object.fromEntries(products.map((product) => [product.slug, product]));
for (const sample of sampleOrders) {
  const phone = sample.phone.replace(/\D/g, "");
  const { data: customer, error: customerError } = await db
    .from("customers")
    .upsert({ phone, name: sample.customer.name, city: sample.customer.city, orders_count: 1, total_spent: sample.totals.total, first_order_at: sample.placedAt, last_order_at: sample.placedAt }, { onConflict: "phone" })
    .select("id")
    .single();
  if (customerError) throw new Error(`customers: ${customerError.message}`);

  const lines = sample.lines.map((line) => {
    const product = productBySlug[line.slug];
    return { product, quantity: line.quantity, variant: line.variant || null, unitPrice: product.price };
  });
  const order = {
    id: sample.id,
    customer_id: customer.id,
    status: sample.status,
    payment_method: sample.payment,
    payment_status: sample.paymentStatus,
    advance_percent: sample.advance.percent,
    advance_amount: sample.advance.amount,
    customer: { name: sample.customer.name, phone, address: "12-C, Khayaban-e-Ittehad, DHA Phase 6", city: sample.customer.city, province: "Sindh" },
    phone,
    subtotal: sample.totals.subtotal,
    discount: sample.totals.discount,
    shipping: sample.totals.shipping,
    total: sample.totals.total,
    coupon_code: sample.coupon?.code || null,
    timeline: sample.timeline,
    courier: sample.timeline.find((entry) => entry.tracking) ? sample.timeline.find((entry) => entry.tracking).label.replace("Shipped with ", "") : null,
    tracking_code: sample.timeline.find((entry) => entry.tracking)?.tracking || null,
    created_at: sample.placedAt,
  };
  const { error: orderError } = await db.from("orders").upsert(order, { onConflict: "id" });
  if (orderError) throw new Error(`orders: ${orderError.message}`);
  await db.from("order_items").delete().eq("order_id", sample.id);
  const { error: itemsError } = await db.from("order_items").insert(lines.map((line) => ({
    order_id: sample.id, product_id: line.product.id, sku: line.product.sku, name: line.product.name, slug: line.product.slug,
    variant_id: line.product.variants?.options.find((option) => option.name === line.variant)?.id || null, variant_name: line.variant,
    quantity: line.quantity, unit_price: line.unitPrice, line_total: line.unitPrice * line.quantity,
  })));
  if (itemsError) throw new Error(`order_items: ${itemsError.message}`);
  console.log(`✓ order ${sample.id} (${lines.length} items)`);
}

console.log("\nSeed complete.");

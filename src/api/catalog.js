/*
 * Catalogue loader. Returns the full storefront dataset in the shape the UI
 * expects (camelCase, same as src/data). Live mode reads Supabase; mock mode
 * returns the local data instantly.
 */
import { supabase, isLive, toError } from "./client.js";
import { products as mockProducts } from "../data/products.js";
import { categories as mockCategories } from "../data/categories.js";
import { departments as mockDepartments } from "../data/departments.js";
import { brands as mockBrands } from "../data/brands.js";
import { concerns as mockConcerns } from "../data/concerns.js";
import { reviews as mockReviews } from "../data/reviews.js";
import { faqs as mockFaqs } from "../data/faqs.js";
import { site, applyStoreSettings } from "../config/site.js";

/* Mock mode has no settings table, so give the demo checkout a bank account to show (marked demo so it is allowed). */
if (!isLive) {
  applyStoreSettings({
    payments: { advance_percent: 50, methods: [{ id: "bank", label: "Bank Transfer", enabled: true, bank: "Demo Bank", account_title: site.name, account_number: "PK00 DEMO 0000 0000 0000 0000" }] },
  });
  site.payments.demo = true;
}

function buildSettings(shipping = {}) {
  return {
    shipping: {
      freeShippingThreshold: shipping.free_shipping_threshold ?? site.shipping.freeShippingThreshold,
      shippingFee: shipping.shipping_fee ?? site.shipping.standardFee,
      estimatedDays: shipping.estimated_days ?? site.shipping.estimatedDays,
    },
    /* Snapshots of the values merged into `site`, so components re-render when they change. */
    payments: { advancePercent: site.payments.advancePercent, holdHours: site.payments.holdHours, methods: site.payments.methods },
    contact: { ...site.contact, ...site.social, announcement: site.announcement.message },
  };
}

export function mapProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    brand: row.brands?.name || row.brand_id,
    category: row.category_id,
    subcategory: row.subcategory,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    images: row.images || [],
    description: row.description || "",
    benefits: row.benefits || [],
    ingredients: row.ingredients || [],
    howToUse: row.how_to_use || "",
    size: row.size || "",
    stock: row.stock,
    rating: Number(row.rating) || 0,
    reviewCount: row.review_count || 0,
    tags: row.tags || [],
    concerns: row.concerns || [],
    variants: row.variants || undefined,
    specs: row.specs || [],
    warranty: row.warranty || "",
    featured: row.featured,
    bestSeller: row.best_seller,
    newArrival: row.new_arrival,
    createdAt: row.created_at || null,
  };
}

function mapCategory(row) {
  return { id: row.id, slug: row.id, department: row.department || "beauty", name: row.name, tagline: row.tagline, description: row.description, image: row.image, subcategories: row.subcategories || [] };
}

function mapDepartment(row) {
  return { id: row.id, name: row.name, tagline: row.tagline || "", description: row.description || "", image: row.image || "" };
}

function mapReview(row) {
  return {
    id: row.id,
    productId: row.product_id,
    author: row.author,
    city: row.city || "",
    rating: row.rating,
    date: row.created_at,
    verified: row.verified,
    title: row.title || "",
    body: row.body,
    photo: row.photo || null,
    helpful: row.helpful,
  };
}

function groupFaqs(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.category)) groups.set(row.category, { category: row.category, items: [] });
    groups.get(row.category).items.push({ question: row.question, answer: row.answer });
  });
  return [...groups.values()];
}

/* What live pages see before the first load finishes (or after it fails): nothing, rather than sample data. */
export function emptyCatalog() {
  return { products: [], categories: [], departments: [], brands: [], concerns: [], reviews: [], faqs: [], settings: buildSettings(), source: "empty" };
}

export function mockCatalog() {
  return {
    products: mockProducts,
    categories: mockCategories,
    departments: mockDepartments,
    brands: mockBrands,
    concerns: mockConcerns,
    reviews: mockReviews,
    faqs: mockFaqs,
    settings: buildSettings(),
    source: "mock",
  };
}

export async function fetchCatalog() {
  if (!isLive) return mockCatalog();

  const [products, categories, departments, brands, concerns, reviews, faqs, settings] = await Promise.all([
    supabase.from("products").select("*, brands(name)").eq("active", true).order("created_at", { ascending: true }),
    supabase.from("categories").select("*").eq("active", true).order("sort_order"),
    supabase.from("departments").select("*").eq("active", true).order("sort_order"),
    supabase.from("brands").select("*").eq("active", true).order("name"),
    supabase.from("concerns").select("*").order("sort_order"),
    supabase.from("reviews").select("*").eq("status", "approved").order("created_at", { ascending: false }),
    supabase.from("faqs").select("*").eq("active", true).order("sort_order"),
    supabase.from("settings").select("*"),
  ]);

  const failed = [products, categories, departments, brands, concerns, reviews, faqs, settings].find((result) => result.error);
  if (failed) throw toError(failed.error, "Could not load the catalogue.");

  /* Contact details and payment accounts are merged into the shared config before anything renders. */
  const byKey = Object.fromEntries(settings.data.map((row) => [row.key, row.value]));
  applyStoreSettings({ contact: byKey.contact, payments: byKey.payments });

  const departmentIds = new Set(departments.data.map((row) => row.id));
  /* A category whose department is hidden is hidden with it, and so are the products in hidden categories. */
  const visibleCategories = categories.data.map(mapCategory).filter((category) => departmentIds.has(category.department));
  const categoryIds = new Set(visibleCategories.map((category) => category.id));
  return {
    products: products.data.filter((row) => categoryIds.has(row.category_id)).map(mapProduct),
    categories: visibleCategories,
    departments: departments.data.map(mapDepartment),
    brands: brands.data.map((row) => ({ id: row.id, name: row.name, tagline: row.tagline, description: row.description, featured: row.featured })),
    concerns: concerns.data.map((row) => ({ id: row.id, name: row.name, description: row.description, image: row.image })),
    reviews: reviews.data.map(mapReview),
    faqs: groupFaqs(faqs.data),
    settings: buildSettings(byKey.shipping),
    source: "supabase",
  };
}

/* Re-reads one product (fresh stock) after an order or when a product page opens. */
export async function fetchProductBySlug(slug) {
  if (!isLive) return mockProducts.find((product) => product.slug === slug) || null;
  const { data, error } = await supabase.from("products").select("*, brands(name)").eq("slug", slug).eq("active", true).maybeSingle();
  if (error) throw toError(error);
  return data ? mapProduct(data) : null;
}

/* Fields that, if unchanged, mean a product update only moved stock (an order or a restock). */
const PRODUCT_DISPLAY_FIELDS = ["name", "slug", "sku", "category", "subcategory", "price", "compareAtPrice", "images", "description", "size", "tags", "concerns", "specs", "warranty", "featured", "bestSeller", "newArrival", "rating", "reviewCount"];

/* Returns the patched product when `row` (a realtime products UPDATE) differs from `current` only in stock; otherwise null. */
export function stockOnlyUpdate(current, row) {
  if (!current || !row || row.active === false || row.brand_id === undefined) return null;
  const next = mapProduct(row);
  const same = PRODUCT_DISPLAY_FIELDS.every((field) => JSON.stringify(current[field] ?? null) === JSON.stringify(next[field] ?? null));
  const sameOptions = JSON.stringify((current.variants?.options || []).map(({ stock, ...rest }) => rest)) === JSON.stringify((next.variants?.options || []).map(({ stock, ...rest }) => rest));
  return same && sameOptions ? { ...current, stock: next.stock, variants: next.variants } : null;
}

/* Calls back (debounced by the caller) whenever the admin changes something the storefront shows. */
export function subscribeToCatalogChanges(onChange) {
  if (!isLive) return () => {};
  const channel = supabase.channel("storefront-catalog");
  ["products", "categories", "departments", "brands", "settings", "reviews"].forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => onChange(table, payload));
  });
  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function submitReview(review) {
  if (!isLive) return { ...review, id: `local-${Date.now()}`, status: "pending" };
  const { error } = await supabase.from("reviews").insert({
    product_id: review.productId,
    author: review.author,
    city: review.city || null,
    rating: review.rating,
    title: review.title,
    body: review.body,
  });
  if (error) throw toError(error, "Could not submit your review.");
  return { ...review, status: "pending" };
}

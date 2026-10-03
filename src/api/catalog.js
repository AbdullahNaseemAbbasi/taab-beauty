/*
 * Catalogue loader. Returns the full storefront dataset in the shape the UI
 * expects (camelCase, same as src/data). Live mode reads Supabase; mock mode
 * returns the local data instantly.
 */
import { supabase, isLive, toError } from "./client.js";
import { products as mockProducts } from "../data/products.js";
import { categories as mockCategories } from "../data/categories.js";
import { brands as mockBrands } from "../data/brands.js";
import { concerns as mockConcerns } from "../data/concerns.js";
import { reviews as mockReviews } from "../data/reviews.js";
import { articles as mockArticles } from "../data/journal.js";
import { faqs as mockFaqs } from "../data/faqs.js";
import { site } from "../config/site.js";

const defaultSettings = {
  shipping: { freeShippingThreshold: site.shipping.freeShippingThreshold, shippingFee: site.shipping.standardFee, estimatedDays: site.shipping.estimatedDays },
  store: { codEnabled: true, bankTransferEnabled: true, cardEnabled: false },
};

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
  };
}

function mapCategory(row) {
  return { id: row.id, slug: row.id, department: row.department || "beauty", name: row.name, tagline: row.tagline, description: row.description, image: row.image, subcategories: row.subcategories || [] };
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

function mapArticle(row) {
  return { slug: row.slug, title: row.title, excerpt: row.excerpt, topic: row.topic, author: row.author, date: row.published_at, readTime: row.read_time, image: row.image, content: row.content || [] };
}

function groupFaqs(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.category)) groups.set(row.category, { category: row.category, items: [] });
    groups.get(row.category).items.push({ question: row.question, answer: row.answer });
  });
  return [...groups.values()];
}

function mapSettings(rows) {
  const settings = { ...defaultSettings };
  rows.forEach((row) => {
    if (row.key === "shipping") {
      settings.shipping = {
        freeShippingThreshold: row.value.free_shipping_threshold ?? defaultSettings.shipping.freeShippingThreshold,
        shippingFee: row.value.shipping_fee ?? defaultSettings.shipping.shippingFee,
        estimatedDays: row.value.estimated_days ?? defaultSettings.shipping.estimatedDays,
      };
    }
    if (row.key === "store") {
      settings.store = {
        codEnabled: row.value.cod_enabled ?? true,
        bankTransferEnabled: row.value.bank_transfer_enabled ?? true,
        cardEnabled: row.value.card_enabled ?? false,
      };
    }
  });
  return settings;
}

export function mockCatalog() {
  return {
    products: mockProducts,
    categories: mockCategories,
    brands: mockBrands,
    concerns: mockConcerns,
    reviews: mockReviews,
    articles: mockArticles,
    faqs: mockFaqs,
    settings: defaultSettings,
    source: "mock",
  };
}

export async function fetchCatalog() {
  if (!isLive) return mockCatalog();

  const [products, categories, brands, concerns, reviews, articles, faqs, settings] = await Promise.all([
    supabase.from("products").select("*, brands(name)").eq("active", true).order("created_at", { ascending: true }),
    supabase.from("categories").select("*").eq("active", true).order("sort_order"),
    supabase.from("brands").select("*").eq("active", true).order("name"),
    supabase.from("concerns").select("*").order("sort_order"),
    supabase.from("reviews").select("*").eq("status", "approved").order("created_at", { ascending: false }),
    supabase.from("articles").select("*").eq("active", true).order("published_at", { ascending: false }),
    supabase.from("faqs").select("*").eq("active", true).order("sort_order"),
    supabase.from("settings").select("*"),
  ]);

  const failed = [products, categories, brands, concerns, reviews, articles, faqs, settings].find((result) => result.error);
  if (failed) throw toError(failed.error, "Could not load the catalogue.");

  return {
    products: products.data.map(mapProduct),
    categories: categories.data.map(mapCategory),
    brands: brands.data.map((row) => ({ id: row.id, name: row.name, tagline: row.tagline, description: row.description, featured: row.featured })),
    concerns: concerns.data.map((row) => ({ id: row.id, name: row.name, description: row.description, image: row.image })),
    reviews: reviews.data.map(mapReview),
    articles: articles.data.map(mapArticle),
    faqs: groupFaqs(faqs.data),
    settings: mapSettings(settings.data),
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

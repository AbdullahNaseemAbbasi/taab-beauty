import { products } from "../data/products.js";

const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

function haystack(product) {
  return [product.name, product.brand, product.category, product.subcategory, product.description, ...(product.tags || []), ...(product.concerns || [])]
    .join(" ")
    .toLowerCase();
}

/* Scores products by how many query tokens they match; name matches rank higher. */
export function searchProducts(query, list = products) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  return list
    .map((product) => {
      const text = haystack(product);
      const name = product.name.toLowerCase();
      let score = 0;
      tokens.forEach((token) => {
        if (name.includes(token)) score += 3;
        if (text.includes(token)) score += 1;
      });
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.rating - a.rating)
    .map((entry) => entry.product);
}

export const defaultFilters = {
  category: null,
  subcategories: [],
  brands: [],
  concerns: [],
  minPrice: null,
  maxPrice: null,
  inStock: false,
  onSale: false,
  minRating: 0,
};

export function filterProducts(list, filters = {}) {
  const f = { ...defaultFilters, ...filters };
  return list.filter((product) => {
    if (f.category && product.category !== f.category) return false;
    if (f.subcategories.length && !f.subcategories.includes(product.subcategory)) return false;
    if (f.brands.length && !f.brands.includes(product.brand)) return false;
    if (f.concerns.length && !f.concerns.some((concern) => product.concerns.includes(concern))) return false;
    if (f.minPrice != null && product.price < f.minPrice) return false;
    if (f.maxPrice != null && product.price > f.maxPrice) return false;
    if (f.inStock && product.stock <= 0) return false;
    if (f.onSale && !(product.compareAtPrice && product.compareAtPrice > product.price)) return false;
    if (f.minRating && product.rating < f.minRating) return false;
    return true;
  });
}

export const sortOptions = [
  { id: "featured", label: "Featured" },
  { id: "bestselling", label: "Best Selling" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "rating", label: "Top Rated" },
];

export function sortProducts(list, sort = "featured") {
  const copy = [...list];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "newest":
      return copy.sort((a, b) => Number(b.newArrival) - Number(a.newArrival) || b.id.localeCompare(a.id));
    case "bestselling":
      return copy.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller) || b.reviewCount - a.reviewCount);
    default:
      return copy.sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.bestSeller) - Number(a.bestSeller) || b.rating - a.rating);
  }
}

export function priceBounds(list) {
  if (!list.length) return { min: 0, max: 0 };
  const prices = list.map((product) => product.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function facetCounts(list, key) {
  const counts = {};
  list.forEach((product) => {
    const values = Array.isArray(product[key]) ? product[key] : [product[key]];
    values.forEach((value) => {
      if (!value) return;
      counts[value] = (counts[value] || 0) + 1;
    });
  });
  return counts;
}

export function isOnSale(product) {
  return Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
}

export function variantStock(product, variantId) {
  if (!product.variants || !variantId) return product.stock;
  const option = product.variants.options.find((entry) => entry.id === variantId);
  return option ? option.stock : product.stock;
}

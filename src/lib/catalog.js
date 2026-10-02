/* Search, filter, sort and recommendation helpers. All functions take the data they operate on. */

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
export function searchProducts(query, list) {
  const tokens = tokenize(query);
  if (!tokens.length || !list) return [];
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

export function relatedProducts(products, product, limit = 4) {
  return products
    .filter((candidate) => candidate.id !== product.id && candidate.category === product.category)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

/* Simple "frequently bought together" rules until real co-purchase data exists. */
const bundleRules = {
  makeup: ["essential-12-piece-brush-set", "airbrush-loose-setting-powder", "glass-shine-lip-gloss"],
  skincare: ["gentle-gel-cleanser", "glow-boost-vitamin-c-serum", "overnight-recovery-cream"],
  haircare: ["argan-and-amla-hair-oil", "neem-wood-detangling-comb", "ceramic-round-blow-dry-brush"],
  fragrance: ["bath-bomb-trio", "sandalwood-spa-candle-set", "rich-repair-hand-and-body-cream"],
  tools: ["skin-fit-serum-foundation", "soft-flush-blush-duo", "glow-boost-vitamin-c-serum"],
};

export function frequentlyBoughtTogether(productBySlug, product, limit = 3) {
  return (bundleRules[product.category] || [])
    .map((slug) => productBySlug[slug])
    .filter((candidate) => candidate && candidate.id !== product.id && candidate.stock > 0 && !candidate.variants)
    .slice(0, limit);
}

export function reviewsForProduct(reviews, productId) {
  return reviews.filter((review) => review.productId === productId).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function ratingBreakdown(reviews, productId) {
  const list = reviewsForProduct(reviews, productId);
  const counts = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: list.filter((review) => review.rating === stars).length }));
  return { total: list.length, counts };
}

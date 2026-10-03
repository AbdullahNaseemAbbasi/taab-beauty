/* Virtual collections computed from product flags (no table needed). */
export const collections = {
  "new-arrivals": {
    slug: "new-arrivals",
    name: "New Arrivals",
    tagline: "Fresh this month.",
    description: "The newest arrivals at Naaz & CO across beauty, electronics and kitchen.",
    filter: (product) => product.newArrival,
  },
  "best-sellers": {
    slug: "best-sellers",
    name: "Best Sellers",
    tagline: "The products our customers reorder.",
    description: "Ranked by real repeat purchases over the last 90 days.",
    filter: (product) => product.bestSeller,
  },
  sale: {
    slug: "sale",
    name: "Sale",
    tagline: "Limited-time prices on favourites.",
    description: "Every product here has a reduced price. Stock is limited and prices return to normal when it runs out.",
    filter: (product) => Boolean(product.compareAtPrice && product.compareAtPrice > product.price),
  },
};

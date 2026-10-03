/* Virtual collections computed from product flags (no table needed). */
export const collections = {
  "new-arrivals": {
    slug: "new-arrivals",
    name: "New Arrivals",
    tagline: "Fresh this month.",
    description: "The newest arrivals at Naz & CO across every department.",
    filter: (product) => product.newArrival,
  },
  "best-sellers": {
    slug: "best-sellers",
    name: "Best Sellers",
    tagline: "The products our customers reorder.",
    description: "Ranked by real repeat purchases over the last 90 days.",
    filter: (product) => product.bestSeller,
  },
};

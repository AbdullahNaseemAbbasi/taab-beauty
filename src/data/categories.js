import { images } from "./images.js";

export const categories = [
  {
    id: "makeup",
    name: "Makeup",
    slug: "makeup",
    tagline: "Colour that stays put from brunch to baraat.",
    description:
      "Lipsticks, foundations, palettes and everything in between, formulated for Pakistani skin tones and humid weather.",
    image: images.categories.makeup,
    subcategories: ["Lips", "Face", "Eyes", "Cheeks"],
  },
  {
    id: "skincare",
    name: "Skincare",
    slug: "skincare",
    tagline: "Simple routines. Visible results.",
    description: "Cleansers, serums, masks and moisturisers built around real concerns: dullness, dryness, breakouts and sun damage.",
    image: images.categories.skincare,
    subcategories: ["Cleansers", "Serums & Oils", "Moisturisers", "Masks", "Eye Care", "Sets"],
  },
  {
    id: "haircare",
    name: "Haircare",
    slug: "haircare",
    tagline: "Strong roots, soft lengths.",
    description: "Oils, tools and styling essentials for hair that handles heat, dust and daily blow-drying.",
    image: images.categories.haircare,
    subcategories: ["Oils & Treatments", "Tools", "Styling"],
  },
  {
    id: "fragrance",
    name: "Fragrance & Body",
    slug: "fragrance",
    tagline: "Scents you will be asked about.",
    description: "Long-lasting eau de parfum and bath rituals designed for warm evenings and air-conditioned days.",
    image: images.categories.fragrance,
    subcategories: ["Eau de Parfum", "Bath & Body", "Home"],
  },
  {
    id: "tools",
    name: "Beauty Tools",
    slug: "tools",
    tagline: "The right tool changes everything.",
    description: "Professional brushes, facial rollers and body tools that make every product work harder.",
    image: images.categories.tools,
    subcategories: ["Brushes", "Facial Tools", "Body Tools"],
  },
];

export const categoryBySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));

export const collections = {
  "new-arrivals": {
    slug: "new-arrivals",
    name: "New Arrivals",
    tagline: "Fresh this month.",
    description: "The newest launches at TAAB, added as soon as they pass our testing.",
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
    filter: (product) => product.compareAtPrice && product.compareAtPrice > product.price,
  },
};

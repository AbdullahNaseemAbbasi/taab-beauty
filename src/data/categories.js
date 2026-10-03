import { images } from "./images.js";

/* Each category belongs to a department (see `departments` in src/config/site.js). */
export const categories = [
  {
    id: "makeup",
    name: "Makeup",
    slug: "makeup",
    department: "beauty",
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
    department: "beauty",
    tagline: "Simple routines. Visible results.",
    description: "Cleansers, serums, masks and moisturisers built around real concerns: dullness, dryness, breakouts and sun damage.",
    image: images.categories.skincare,
    subcategories: ["Cleansers", "Serums & Oils", "Moisturisers", "Masks", "Eye Care", "Sets"],
  },
  {
    id: "haircare",
    name: "Haircare",
    slug: "haircare",
    department: "beauty",
    tagline: "Strong roots, soft lengths.",
    description: "Oils, tools and styling essentials for hair that handles heat, dust and daily blow-drying.",
    image: images.categories.haircare,
    subcategories: ["Oils & Treatments", "Tools", "Styling"],
  },
  {
    id: "fragrance",
    name: "Fragrance & Body",
    slug: "fragrance",
    department: "beauty",
    tagline: "Scents you will be asked about.",
    description: "Long-lasting eau de parfum and bath rituals designed for warm evenings and air-conditioned days.",
    image: images.categories.fragrance,
    subcategories: ["Eau de Parfum", "Bath & Body", "Home"],
  },
  {
    id: "tools",
    name: "Beauty Tools",
    slug: "tools",
    department: "beauty",
    tagline: "The right tool changes everything.",
    description: "Professional brushes, facial rollers and body tools that make every product work harder.",
    image: images.categories.tools,
    subcategories: ["Brushes", "Facial Tools", "Body Tools"],
  },
  {
    id: "electronics",
    name: "Electronics",
    slug: "electronics",
    department: "electronics",
    tagline: "Everyday tech that just works.",
    description: "Audio, wearables, chargers and gadgets. Every unit is checked before dispatch and covered by warranty.",
    image: images.categories.electronics,
    subcategories: ["Audio", "Wearables", "Charging & Power", "Gaming & Gadgets"],
  },
  {
    id: "kitchen",
    name: "Kitchen & Dining",
    slug: "kitchen",
    department: "kitchen",
    tagline: "Cook, serve and store better.",
    description: "Cookware, knives, storage and serveware that stand up to daily cooking, from the first chai to the last roti.",
    image: images.categories.kitchen,
    subcategories: ["Cookware", "Knives & Tools", "Tea & Coffee", "Storage", "Dinnerware"],
  },
];

export const categoryBySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));

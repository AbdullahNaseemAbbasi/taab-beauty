export const brands = [
  {
    id: "taab",
    name: "TAAB",
    tagline: "The house line",
    description: "Our own makeup, skincare and tools, developed in Karachi and tested on real Pakistani skin in real Pakistani weather.",
    featured: true,
  },
  {
    id: "mehr-botanicals",
    name: "Mehr Botanicals",
    tagline: "Plant-powered skincare",
    description: "Cold-pressed oils and botanical serums with short, honest ingredient lists.",
    featured: true,
  },
  {
    id: "saaf-skin-lab",
    name: "Saaf Skin Lab",
    tagline: "Clinical, fragrance-free",
    description: "Dermatologist-led formulas for sensitive and acne-prone skin.",
    featured: true,
  },
  {
    id: "kesh-rituals",
    name: "Kesh Rituals",
    tagline: "Traditional hair oiling, modern tools",
    description: "Hair oils and tools inspired by the champi ritual and built for daily use.",
    featured: true,
  },
  {
    id: "oudh-atelier",
    name: "Oudh Atelier",
    tagline: "Fragrance from Lahore",
    description: "Small-batch eau de parfum and bath rituals with notes of rose, oud and sandalwood.",
    featured: true,
  },
];

export const brandById = Object.fromEntries(brands.map((brand) => [brand.id, brand]));

export const brands = [
  {
    id: "naz-co",
    name: "Naz & CO",
    tagline: "The house line",
    description: "Our own makeup, tools and everyday essentials, developed in Karachi and tested in real Pakistani homes and weather.",
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
  {
    id: "sada-audio",
    name: "Sada Audio",
    tagline: "Sound for every day",
    description: "Earbuds, headphones and speakers tuned for calls, commutes and long playlists.",
    featured: true,
  },
  {
    id: "roshan-tech",
    name: "Roshan Tech",
    tagline: "Power and desk essentials",
    description: "Chargers, power banks, wearables and accessories that survive load-shedding and long days.",
    featured: true,
  },
  {
    id: "libaas-studio",
    name: "Libaas Studio",
    tagline: "Everyday clothing",
    description: "Well-cut basics and easy dresses for women, men and kids, in fabrics that suit our weather.",
    featured: true,
  },
  {
    id: "dastarkhwan-home",
    name: "Dastarkhwan Home",
    tagline: "Kitchen and table",
    description: "Cookware, storage and serveware made for daily cooking and for guests.",
    featured: true,
  },
];

export const brandById = Object.fromEntries(brands.map((brand) => [brand.id, brand]));

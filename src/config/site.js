/*
 * Central site configuration. Every brand-level value lives here so nothing is
 * scattered through components. Secrets and tracking IDs come from environment
 * variables (see .env.example); Vite exposes variables prefixed with VITE_.
 */
const env = import.meta.env;

export const site = {
  name: "TAAB",
  legalName: "TAAB Beauty (Pvt.) Ltd.",
  tagline: "Radiance, made simple.",
  description:
    "TAAB is a premium beauty brand from Karachi. Makeup, skincare, haircare, fragrance and beauty tools, delivered across Pakistan with cash on delivery.",
  domain: "taab.co",
  url: env.VITE_SITE_URL || "https://taab.co",
  launchYear: 2026,
  locale: "en-PK",
  currency: { code: "PKR", symbol: "Rs.", locale: "en-PK" },

  contact: {
    email: "hello@taab.co",
    phone: "+92 300 1234567",
    whatsapp: "923001234567",
    hours: "Mon to Sat, 10am to 8pm PKT",
    address: "Suite 4, Bukhari Commercial, DHA Phase 6, Karachi, Pakistan",
  },

  social: {
    instagram: "https://instagram.com/taab.beauty",
    facebook: "https://facebook.com/taabbeauty",
    tiktok: "https://tiktok.com/@taab.beauty",
    youtube: "https://youtube.com/@taabbeauty",
    reddit: "https://reddit.com/r/PakistaniBeauty",
    whatsapp: "https://wa.me/923001234567",
  },

  shipping: {
    freeShippingThreshold: 7000,
    standardFee: 250,
    estimatedDays: "2 to 4 business days",
    expressCities: ["Karachi"],
    expressDays: "Next business day",
    provinces: ["Sindh", "Punjab", "Khyber Pakhtunkhwa", "Balochistan", "Gilgit-Baltistan", "Azad Kashmir", "Islamabad Capital Territory"],
    couriers: ["TCS", "Leopards", "M&P"],
  },

  payments: {
    methods: [
      { id: "cod", label: "Cash on Delivery", description: "Pay in cash when your order arrives.", enabled: true },
      { id: "bank", label: "Bank Transfer", description: "Transfer to our bank account and share the receipt on WhatsApp.", enabled: true },
      { id: "card", label: "Debit / Credit Card", description: "Secure online payment.", enabled: env.VITE_ONLINE_PAYMENTS === "true", provider: env.VITE_PAYMENT_PROVIDER || "" },
    ],
    bankDetails: { bank: "Meezan Bank", title: "TAAB Beauty", iban: "PK00 MEZN 0000 0000 0000 0000" },
  },

  analytics: {
    metaPixelId: env.VITE_META_PIXEL_ID || "",
    tiktokPixelId: env.VITE_TIKTOK_PIXEL_ID || "",
    gaId: env.VITE_GA_ID || "",
    gtmId: env.VITE_GTM_ID || "",
    debug: env.DEV || env.VITE_ANALYTICS_DEBUG === "true",
  },

  announcement: {
    message: "Free delivery on orders over Rs. 7,000. Cash on delivery across Pakistan.",
    link: { label: "Shop new arrivals", to: "/new-arrivals" },
  },

  trustSignals: [
    { icon: "shield", title: "100% Authentic", text: "Every product is sourced directly and sealed." },
    { icon: "truck", title: "Nationwide Delivery", text: "2 to 4 days anywhere in Pakistan." },
    { icon: "cash", title: "Cash on Delivery", text: "Pay when your order arrives." },
    { icon: "refresh", title: "7-Day Returns", text: "Easy returns on unopened products." },
  ],
};

export const nav = [
  { label: "Shop", to: "/shop", mega: true },
  { label: "Makeup", to: "/shop/makeup" },
  { label: "Skincare", to: "/shop/skincare" },
  { label: "Haircare", to: "/shop/haircare" },
  { label: "Fragrance", to: "/shop/fragrance" },
  { label: "Sale", to: "/sale" },
  { label: "Journal", to: "/journal" },
];

export const footerLinks = {
  shop: [
    { label: "All Products", to: "/shop" },
    { label: "New Arrivals", to: "/new-arrivals" },
    { label: "Best Sellers", to: "/best-sellers" },
    { label: "Sale", to: "/sale" },
    { label: "Beauty Tools", to: "/shop/tools" },
  ],
  help: [
    { label: "Track Order", to: "/track-order" },
    { label: "Shipping Policy", to: "/shipping-policy" },
    { label: "Returns & Refunds", to: "/returns" },
    { label: "FAQ", to: "/faq" },
    { label: "Contact Us", to: "/contact" },
  ],
  company: [
    { label: "About TAAB", to: "/about" },
    { label: "Beauty Journal", to: "/journal" },
    { label: "Privacy Policy", to: "/privacy-policy" },
    { label: "Terms & Conditions", to: "/terms" },
  ],
};

/*
 * Central site configuration. Every brand-level value lives here so nothing is
 * scattered through components. Secrets and tracking IDs come from environment
 * variables (see .env.example); Vite exposes variables prefixed with VITE_.
 */
const env = import.meta.env;

export const site = {
  name: "Naaz & CO",
  legalName: "Naaz & CO",
  tagline: "Good things for you and your home.",
  description:
    "Naaz & CO is an online store from Karachi for beauty, electronics and kitchenware, delivered across Pakistan with cash on delivery.",
  domain: "naazandco.com",
  url: env.VITE_SITE_URL || "https://naazandco.com",
  launchYear: 2026,
  locale: "en-PK",
  currency: { code: "PKR", symbol: "Rs.", locale: "en-PK" },

  contact: {
    email: "hello@naazandco.com",
    phone: "+92 300 1234567",
    whatsapp: "923001234567",
    hours: "Mon to Sat, 10am to 8pm PKT",
    address: "Suite 4, Bukhari Commercial, DHA Phase 6, Karachi, Pakistan",
  },

  social: {
    handle: "@naazandco",
    instagram: "https://instagram.com/naazandco",
    facebook: "https://facebook.com/naazandco",
    tiktok: "https://tiktok.com/@naazandco",
    youtube: "https://youtube.com/@naazandco",
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
    bankDetails: { bank: "Meezan Bank", title: "Naaz & CO", iban: "PK00 MEZN 0000 0000 0000 0000" },
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
    { icon: "shield", title: "100% Genuine", text: "Sourced directly, checked and sealed." },
    { icon: "truck", title: "Nationwide Delivery", text: "2 to 4 days anywhere in Pakistan." },
    { icon: "cash", title: "Cash on Delivery", text: "Pay when your order arrives." },
    { icon: "refresh", title: "7-Day Returns", text: "Unused items in original packaging." },
  ],
};

/*
 * Departments group the categories. Beauty spans several categories and has
 * its own landing page; Electronics and Kitchen are one category each.
 */
export const departments = [
  {
    id: "beauty",
    name: "Beauty",
    to: "/beauty",
    tagline: "Makeup, skincare, haircare and fragrance.",
    description: "Makeup, skincare, haircare, fragrance and tools chosen for Pakistani skin tones and Pakistani weather.",
  },
  {
    id: "electronics",
    name: "Electronics",
    to: "/shop/electronics",
    tagline: "Everyday tech that just works.",
    description: "Audio, wearables, chargers and gadgets, checked before dispatch and covered by warranty.",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    to: "/shop/kitchen",
    tagline: "Cook, serve and store better.",
    description: "Cookware, knives, teaware, storage and serveware for busy kitchens.",
  },
];

export const departmentById = Object.fromEntries(departments.map((department) => [department.id, department]));

export const nav = [
  { label: "Shop", to: "/shop", mega: true },
  { label: "Beauty", to: "/beauty" },
  { label: "Electronics", to: "/shop/electronics" },
  { label: "Kitchen", to: "/shop/kitchen" },
  { label: "Sale", to: "/sale" },
  { label: "Journal", to: "/journal" },
];

export const footerLinks = {
  shop: [
    { label: "All Products", to: "/shop" },
    { label: "Beauty", to: "/beauty" },
    { label: "Electronics", to: "/shop/electronics" },
    { label: "Kitchen", to: "/shop/kitchen" },
    { label: "New Arrivals", to: "/new-arrivals" },
    { label: "Best Sellers", to: "/best-sellers" },
    { label: "Sale", to: "/sale" },
  ],
  help: [
    { label: "Track Order", to: "/track-order" },
    { label: "Shipping Policy", to: "/shipping-policy" },
    { label: "Returns & Warranty", to: "/returns" },
    { label: "FAQ", to: "/faq" },
    { label: "Contact Us", to: "/contact" },
  ],
  company: [
    { label: "About Naaz & CO", to: "/about" },
    { label: "Journal", to: "/journal" },
    { label: "Privacy Policy", to: "/privacy-policy" },
    { label: "Terms & Conditions", to: "/terms" },
  ],
};

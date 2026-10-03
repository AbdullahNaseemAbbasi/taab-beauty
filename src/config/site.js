/*
 * Central site configuration. Brand-level values live here. Contact details,
 * social links, the announcement and the payment accounts are defaults only:
 * the live values are edited in Admin → Settings and merged in by
 * applyStoreSettings() when the catalogue loads. Secrets and tracking IDs come
 * from environment variables (see .env.example).
 */
const env = import.meta.env;
const origin = typeof window !== "undefined" ? window.location.origin : "";

const paymentDescriptions = {
  bank: "Transfer the advance to our bank account.",
  easypaisa: "Send the advance to our Easypaisa account.",
  jazzcash: "Send the advance to our JazzCash account.",
  card: "Secure online payment.",
};

export const site = {
  name: "Naz & CO",
  legalName: "Naz & CO",
  tagline: "Good things for you and your home.",
  description:
    "Naz & CO is an online store from Karachi for beauty, appliances, clothes and more, delivered across Pakistan. Pay part in advance and the rest when your order arrives.",
  url: env.VITE_SITE_URL || origin,
  launchYear: 2026,
  locale: "en-PK",
  currency: { code: "PKR", symbol: "Rs.", locale: "en-PK" },

  contact: {
    email: "",
    phone: "+92 300 1234567",
    whatsapp: "923001234567",
    hours: "Mon to Sat, 10am to 8pm PKT",
    address: "Suite 4, Bukhari Commercial, DHA Phase 6, Karachi, Pakistan",
  },

  social: { instagram: "", facebook: "", tiktok: "", youtube: "", whatsapp: "https://wa.me/923001234567" },

  shipping: {
    freeShippingThreshold: 7000,
    standardFee: 250,
    estimatedDays: "2 to 4 business days",
    expressCities: ["Karachi"],
    expressDays: "Next business day",
    provinces: ["Sindh", "Punjab", "Khyber Pakhtunkhwa", "Balochistan", "Gilgit-Baltistan", "Azad Kashmir", "Islamabad Capital Territory"],
    couriers: ["TCS", "Leopards", "M&P"],
  },

  /* No cash on delivery: an advance confirms the order and the balance is paid on delivery. */
  payments: {
    advancePercent: 50,
    methods: [
      { id: "bank", label: "Bank Transfer", description: paymentDescriptions.bank, enabled: true, bank: "", accountTitle: "", accountNumber: "" },
      { id: "easypaisa", label: "Easypaisa", description: paymentDescriptions.easypaisa, enabled: false, bank: "", accountTitle: "", accountNumber: "" },
      { id: "jazzcash", label: "JazzCash", description: paymentDescriptions.jazzcash, enabled: false, bank: "", accountTitle: "", accountNumber: "" },
    ],
    onlineCard: { enabled: env.VITE_ONLINE_PAYMENTS === "true", provider: env.VITE_PAYMENT_PROVIDER || "" },
  },

  analytics: {
    metaPixelId: env.VITE_META_PIXEL_ID || "",
    tiktokPixelId: env.VITE_TIKTOK_PIXEL_ID || "",
    gaId: env.VITE_GA_ID || "",
    gtmId: env.VITE_GTM_ID || "",
    debug: env.DEV || env.VITE_ANALYTICS_DEBUG === "true",
  },

  /* Empty = build the line from the delivery and advance settings. */
  announcement: { message: "", link: { label: "Shop new arrivals", to: "/new-arrivals" } },
};

export const paymentLabel = (id) => site.payments.methods.find((method) => method.id === id)?.label || { card: "Debit / Credit Card", cod: "Cash on Delivery" }[id] || id;

/* Payment methods a customer can actually use: switched on and with an account to pay into. */
export const availablePaymentMethods = () => site.payments.methods.filter((method) => method.enabled && method.accountNumber.trim());

/* Splits an order total into the advance and the balance due on delivery. */
export function splitPayment(total, percent = site.payments.advancePercent) {
  const advance = Math.ceil((total * percent) / 100);
  return { percent, advance, balance: Math.max(total - advance, 0) };
}

/* Merges the settings saved in the database into the config object above. */
export function applyStoreSettings({ contact, payments } = {}) {
  if (contact) {
    const clean = (value) => String(value ?? "").trim();
    Object.assign(site.contact, {
      email: clean(contact.email),
      phone: clean(contact.phone) || site.contact.phone,
      whatsapp: clean(contact.whatsapp).replace(/\D/g, "") || site.contact.whatsapp,
      hours: clean(contact.hours) || site.contact.hours,
      address: clean(contact.address) || site.contact.address,
    });
    Object.assign(site.social, {
      instagram: clean(contact.instagram),
      facebook: clean(contact.facebook),
      tiktok: clean(contact.tiktok),
      youtube: clean(contact.youtube),
      whatsapp: `https://wa.me/${site.contact.whatsapp}`,
    });
    site.announcement.message = clean(contact.announcement);
  }
  if (payments) {
    const percent = Number(payments.advance_percent);
    site.payments.advancePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, Math.round(percent))) : 50;
    if (Array.isArray(payments.methods)) {
      site.payments.methods = payments.methods.map((method) => ({
        id: method.id,
        label: method.label || method.id,
        description: paymentDescriptions[method.id] || "",
        enabled: Boolean(method.enabled),
        bank: method.bank || "",
        accountTitle: method.account_title || "",
        accountNumber: method.account_number || "",
      }));
    }
  }
}

export const helpLinks = [
  { label: "Track Order", to: "/track-order" },
  { label: "Payment & Advance", to: "/payment-policy" },
  { label: "Shipping Policy", to: "/shipping-policy" },
  { label: "Returns & Warranty", to: "/returns" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact Us", to: "/contact" },
];

export const companyLinks = [
  { label: "About Naz & CO", to: "/about" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms & Conditions", to: "/terms" },
];

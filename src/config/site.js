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
  nayapay: "Send the advance to our NayaPay account.",
  sadapay: "Send the advance to our SadaPay account.",
};

export const site = {
  name: "Naz & CO",
  legalName: "Naz & CO",
  description:
    "Naz & CO is an online store from Karachi for clothing, beauty, appliances and more, delivered across Pakistan. Pay part in advance and the rest when your order arrives.",
  url: env.VITE_SITE_URL || origin,
  currency: { code: "PKR", symbol: "Rs.", locale: "en-PK" },

  /* Empty until filled in Admin → Settings; anything empty is simply not shown. */
  contact: { email: "", phone: "", whatsapp: "", hours: "", address: "" },

  social: { instagram: "", facebook: "", tiktok: "", youtube: "", whatsapp: "" },

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
    /* Hours an unpaid order holds its stock before the database cancels it. */
    holdHours: 48,
    methods: [
      { id: "bank", label: "Bank Transfer", description: paymentDescriptions.bank, enabled: true, bank: "", accountTitle: "", accountNumber: "" },
      { id: "easypaisa", label: "Easypaisa", description: paymentDescriptions.easypaisa, enabled: false, bank: "", accountTitle: "", accountNumber: "" },
      { id: "jazzcash", label: "JazzCash", description: paymentDescriptions.jazzcash, enabled: false, bank: "", accountTitle: "", accountNumber: "" },
      { id: "nayapay", label: "NayaPay", description: paymentDescriptions.nayapay, enabled: false, bank: "", accountTitle: "", accountNumber: "" },
      { id: "sadapay", label: "SadaPay", description: paymentDescriptions.sadapay, enabled: false, bank: "", accountTitle: "", accountNumber: "" },
    ],
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

/* "cod" only labels orders placed before cash on delivery was removed. */
export const paymentLabel = (id) => site.payments.methods.find((method) => method.id === id)?.label || { cod: "Cash on Delivery" }[id] || id;

/* Sample account numbers (zeros, 1234567, DEMO) must never be shown as a real account. Same rule as place_order in the database. */
export function isPlaceholderAccount(number) {
  const value = String(number ?? "").toUpperCase();
  const compact = value.replace(/\s/g, "");
  return value.includes("0000 0000") || compact.includes("00000000") || compact.includes("1234567") || value.includes("DEMO");
}

/* Payment methods a customer can actually use: switched on and with a real account to pay into. */
export const availablePaymentMethods = () =>
  site.payments.methods.filter((method) => method.enabled && method.accountNumber.trim() && !isPlaceholderAccount(method.accountNumber));

/* WhatsApp wants the international form: 0300 1234567, +92 300 1234567 and 3001234567 all become 923001234567. */
export function normalizeWhatsApp(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  if (/^03\d{9}$/.test(digits)) return `92${digits.slice(1)}`;
  if (/^3\d{9}$/.test(digits)) return `92${digits}`;
  return digits;
}

/* tel: links cannot contain spaces or dashes. */
export const telHref = (phone) => `tel:${String(phone ?? "").replace(/[^\d+]/g, "")}`;

/* Splits an order total into the advance and the balance due on delivery. */
export function splitPayment(total, percent = site.payments.advancePercent) {
  const advance = Math.ceil((total * percent) / 100);
  return { percent, advance, balance: Math.max(total - advance, 0) };
}

/* Merges the settings saved in the database into the config object above. */
export function applyStoreSettings({ contact, payments } = {}) {
  if (contact) {
    const clean = (value) => String(value ?? "").trim();
    /* No fallbacks: an empty field hides that detail instead of showing a sample number. */
    Object.assign(site.contact, {
      email: clean(contact.email),
      phone: clean(contact.phone),
      whatsapp: normalizeWhatsApp(contact.whatsapp),
      hours: clean(contact.hours),
      address: clean(contact.address),
    });
    Object.assign(site.social, {
      instagram: clean(contact.instagram),
      facebook: clean(contact.facebook),
      tiktok: clean(contact.tiktok),
      youtube: clean(contact.youtube),
      whatsapp: site.contact.whatsapp ? `https://wa.me/${site.contact.whatsapp}` : "",
    });
    site.announcement.message = clean(contact.announcement);
  }
  if (payments) {
    const percent = Number(payments.advance_percent);
    site.payments.advancePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, Math.round(percent))) : 50;
    const hold = Number(payments.hold_hours);
    site.payments.holdHours = Number.isFinite(hold) && hold > 0 ? Math.min(168, Math.max(12, Math.round(hold))) : 48;
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
  { label: "Tracking", to: "/track-order" },
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

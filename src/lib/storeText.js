import { site, availablePaymentMethods } from "../config/site.js";
import { formatPrice } from "./format.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";

/* "TCS, Leopards and M&P" */
function listWords(words) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/* The store's contact line for the terms, built only from the details that are filled in. */
function contactLine() {
  const { phone, address, whatsapp } = site.contact;
  const reach = phone ? `${whatsapp ? "WhatsApp or call" : "Call"} ${phone}` : whatsapp ? "Message us on WhatsApp" : "";
  return `${address ? `${site.name}, ${address}.` : `${site.name}.`} ${reach ? `${reach}, or use the Contact page.` : "Use the Contact page to reach us."}`;
}

/*
 * Policies and FAQs are written once with placeholders such as {advancePercent}
 * so they always quote the current settings (Admin → Settings) instead of going stale.
 */
export function storeTextValues(settings) {
  const advance = settings.payments.advancePercent;
  return {
    name: site.name,
    advancePercent: `${advance}%`,
    balancePercent: `${Math.max(100 - advance, 0)}%`,
    holdHours: `${settings.payments.holdHours ?? site.payments.holdHours} hours`,
    freeOver: formatPrice(settings.shipping.freeShippingThreshold),
    fee: formatPrice(settings.shipping.shippingFee),
    deliveryTime: settings.shipping.estimatedDays,
    couriers: listWords(site.shipping.couriers),
    contactLine: contactLine(),
    /* Kept for texts saved in the database before {contactLine} existed; neutral when the detail is empty. */
    phone: site.contact.phone || "the number on our Contact page",
    address: site.contact.address || "Pakistan",
    methods: availablePaymentMethods().map((method) => method.label).join(", ") || "bank transfer",
  };
}

export function fillText(text, values) {
  return String(text ?? "").replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

/* Returns a function that fills the placeholders with the live settings. */
export function useStoreText() {
  const { settings } = useCatalog();
  const values = storeTextValues(settings);
  return (text) => fillText(text, values);
}

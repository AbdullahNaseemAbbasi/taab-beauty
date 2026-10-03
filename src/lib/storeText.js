import { site } from "../config/site.js";
import { formatPrice } from "./format.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";

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
    freeOver: formatPrice(settings.shipping.freeShippingThreshold),
    fee: formatPrice(settings.shipping.shippingFee),
    deliveryTime: settings.shipping.estimatedDays,
    phone: site.contact.phone,
    address: site.contact.address,
    methods: site.payments.methods.filter((method) => method.enabled).map((method) => method.label).join(", ") || "bank transfer",
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

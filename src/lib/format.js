import { site } from "../config/site.js";

const formatter = new Intl.NumberFormat(site.currency.locale, { maximumFractionDigits: 0 });

export function formatPrice(amount) {
  return `${site.currency.symbol} ${formatter.format(Math.round(amount))}`;
}

export function discountPercent(price, compareAtPrice) {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(value));
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

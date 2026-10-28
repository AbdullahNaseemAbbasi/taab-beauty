/* Small helpers shared by the admin pages. */
import { site } from "../config/site.js";

export const ORDER_STATUSES = [
  { id: "created", label: "Awaiting advance" },
  { id: "confirmed", label: "Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "returned", label: "Returned" },
  { id: "refunded", label: "Refunded" },
  { id: "failed", label: "Payment failed" },
];

export const statusLabel = (id) => ORDER_STATUSES.find((status) => status.id === id)?.label || id;

export const statusTone = (id) =>
  ({ created: "gold", confirmed: "teal", processing: "teal", packed: "navy", shipped: "navy", out_for_delivery: "mint", delivered: "success", cancelled: "danger", failed: "danger", returned: "danger", refunded: "danger" }[id] || "muted");

/* The status an order usually moves to next. */
export const nextStatus = (id) => ({ created: "confirmed", confirmed: "processing", processing: "packed", packed: "shipped", shipped: "out_for_delivery", out_for_delivery: "delivered" }[id] || id);

/* Statuses that end an order; moving out of them takes the items out of stock again. */
export const CLOSED_STATUSES = ["cancelled", "failed", "returned", "refunded"];

/* The store's couriers (site config) plus the two fallbacks. */
export const COURIERS = [...new Set([...(site.shipping.couriers || []), "Self delivery", "Other"])];

/* Database row (with order_items) → the shape the storefront components use. */
export function mapOrder(row) {
  return {
    id: row.id,
    placedAt: row.created_at,
    status: row.status,
    payment: row.payment_method,
    paymentStatus: row.payment_status,
    customer: row.customer || {},
    phone: row.phone,
    notes: row.notes,
    coupon: row.coupon_code ? { code: row.coupon_code } : null,
    creatorId: row.creator_id,
    attribution: row.attribution || {},
    timeline: row.timeline || [],
    courier: row.courier,
    trackingCode: row.tracking_code,
    totals: { subtotal: row.subtotal, discount: row.discount, shipping: row.shipping, total: row.total },
    advance: { percent: row.advance_percent || 0, amount: row.advance_amount || 0, balance: row.total - (row.advance_amount || 0) },
    lines: (row.order_items || []).map((item) => ({
      productId: item.product_id,
      sku: item.sku,
      name: item.name,
      slug: item.slug,
      variantId: item.variant_id,
      variant: item.variant_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
  };
}

/* A Pakistani mobile number in international form without "+" (03xx → 923xx). */
export function toInternational(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("92") ? digits : digits.startsWith("0") ? `92${digits.slice(1)}` : `92${digits}`;
}

/* WhatsApp link to a Pakistani mobile number. */
export function waLink(phone, text = "") {
  return `https://wa.me/${toInternational(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/* First name for a friendly greeting; copes with a missing name. */
export const firstName = (name, fallback = "there") => String(name || "").trim().split(/\s+/)[0] || fallback;

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(typeof row[header] === "object" ? JSON.stringify(row[header]) : row[header])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* Turns a name into a URL-safe id, e.g. "Home & Living" → "home-living". */
export const toSlug = (value) => String(value || "").toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const percent = (part, whole) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : "0%");

/* Low on stock: the total is at or under the alert level, or one of its options has sold out. */
export const isLowStock = (row) => row.stock <= row.low_stock_threshold || (row.variants?.options || []).some((option) => Number(option.stock) <= 0);

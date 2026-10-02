import { site } from "../config/site.js";
import { productById, productBySlug } from "../data/products.js";
import { findCoupon, sampleOrders } from "../data/misc.js";
import { attributionForOrder } from "../analytics/attribution.js";

const ORDERS_KEY = "taab:orders";

export function lineKey(productId, variantId) {
  return variantId ? `${productId}:${variantId}` : productId;
}

/* Attaches product objects and prices to the compact stored lines. */
export function enrichLines(lines) {
  return lines
    .map((line) => {
      const product = productById[line.productId];
      if (!product) return null;
      const variant = product.variants?.options.find((option) => option.id === line.variantId) || null;
      return {
        ...line,
        key: lineKey(line.productId, line.variantId),
        product,
        variant,
        unitPrice: product.price,
        lineTotal: product.price * line.quantity,
      };
    })
    .filter(Boolean);
}

export function evaluateCoupon(code, subtotal) {
  const coupon = findCoupon(code);
  if (!coupon) return { coupon: null, discount: 0, error: "That code is not valid." };
  if (subtotal < coupon.minOrder) {
    return { coupon: null, discount: 0, error: `This code needs a minimum order of ${site.currency.symbol} ${coupon.minOrder.toLocaleString()}.` };
  }
  let discount = 0;
  if (coupon.type === "percent") discount = Math.round((subtotal * coupon.value) / 100);
  if (coupon.type === "fixed") discount = Math.min(coupon.value, subtotal);
  return { coupon, discount, error: null };
}

export function computeTotals(enrichedLines, coupon = null) {
  const subtotal = enrichedLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const { discount } = coupon ? evaluateCoupon(coupon.code, subtotal) : { discount: 0 };
  const afterDiscount = Math.max(subtotal - discount, 0);
  const freeShipping = afterDiscount >= site.shipping.freeShippingThreshold || coupon?.type === "shipping";
  const shipping = enrichedLines.length === 0 || freeShipping ? 0 : site.shipping.standardFee;
  return {
    subtotal,
    discount,
    shipping,
    total: afterDiscount + shipping,
    itemCount: enrichedLines.reduce((sum, line) => sum + line.quantity, 0),
    freeShippingRemaining: freeShipping ? 0 : Math.max(site.shipping.freeShippingThreshold - afterDiscount, 0),
  };
}

function readOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function orderId(date = new Date()) {
  const stamp = date.toISOString().slice(2, 10).replace(/-/g, "");
  const serial = String(Math.floor(Math.random() * 9000) + 1000);
  return `TB-${stamp}-${serial}`;
}

/* Creates an order record (stored locally in this static build) and returns it. */
export function createOrder({ customer, lines, coupon, payment, notes }) {
  const enriched = enrichLines(lines);
  const totals = computeTotals(enriched, coupon);
  const now = new Date();
  const order = {
    id: orderId(now),
    placedAt: now.toISOString(),
    status: payment === "cod" ? "confirmed" : "created",
    payment,
    notes: notes || "",
    customer,
    phone: customer.phone,
    coupon: coupon ? { code: coupon.code, creatorId: coupon.creatorId } : null,
    lines: enriched.map((line) => ({ productId: line.productId, slug: line.product.slug, variant: line.variant?.name || null, quantity: line.quantity, unitPrice: line.unitPrice })),
    totals,
    attribution: attributionForOrder(),
    timeline: [
      { status: "created", label: "Order placed", at: now.toISOString() },
      ...(payment === "cod" ? [{ status: "confirmed", label: "Order confirmed (cash on delivery)", at: now.toISOString() }] : []),
    ],
  };
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...readOrders()]));
  } catch {
    /* ignore */
  }
  return order;
}

function normalizeOrder(order) {
  return {
    ...order,
    lines: order.lines.map((line) => {
      const product = line.slug ? productBySlug[line.slug] : productById[line.productId];
      return { ...line, product, unitPrice: line.unitPrice ?? product?.price ?? 0 };
    }),
  };
}

export function getOrder(id) {
  const wanted = String(id || "").trim().toUpperCase();
  const local = readOrders().find((order) => order.id === wanted);
  const sample = sampleOrders.find((order) => order.id === wanted);
  const order = local || sample;
  return order ? normalizeOrder(order) : null;
}

export function getOrdersByPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  if (!digits) return [];
  return [...readOrders(), ...sampleOrders]
    .filter((order) => String(order.phone || order.customer?.phone || "").replace(/\D/g, "").endsWith(digits))
    .map(normalizeOrder);
}

export function allLocalOrders() {
  return [...readOrders(), ...sampleOrders].map(normalizeOrder);
}

/*
 * Orders and coupons. Live mode calls the SECURITY DEFINER functions in the
 * database (prices, stock and coupons are validated server-side). Mock mode
 * keeps orders in localStorage so the whole flow works without a backend.
 */
import { supabase, isLive, toError } from "./client.js";
import { findCoupon, sampleOrders } from "../data/misc.js";
import { attributionForOrder } from "../analytics/attribution.js";

const ORDERS_KEY = "taab:orders";
const PLACED_KEY = "taab:orders:placed"; // [{ id, phone }] for orders placed on this device

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function rememberPlacedOrder(id, phone) {
  const list = readJson(PLACED_KEY, []).filter((entry) => entry.id !== id);
  writeJson(PLACED_KEY, [{ id, phone }, ...list].slice(0, 20));
}

export function placedOrders() {
  return readJson(PLACED_KEY, []);
}

export function phoneForOrder(id) {
  return placedOrders().find((entry) => entry.id === id)?.phone || null;
}

/* ------------------------------------------------------------- coupons */
export async function validateCoupon(code, subtotal) {
  if (!isLive) {
    const coupon = findCoupon(code);
    if (!coupon) return { valid: false, error: "That code is not valid." };
    if (subtotal < coupon.minOrder) return { valid: false, error: `This code needs a minimum order of Rs. ${coupon.minOrder.toLocaleString()}.` };
    const discount = coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.type === "fixed" ? Math.min(coupon.value, subtotal) : 0;
    return { valid: true, ...coupon, discount };
  }
  const { data, error } = await supabase.rpc("validate_coupon", { p_code: code, p_subtotal: Math.round(subtotal) });
  if (error) throw toError(error, "Could not check that code right now.");
  return data;
}

/* ---------------------------------------------------------- place order */
function orderId(date = new Date()) {
  const stamp = date.toISOString().slice(2, 10).replace(/-/g, "");
  return `TB-${stamp}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function mockPlaceOrder({ customer, lines, coupon, payment, notes, totals }) {
  const now = new Date().toISOString();
  const order = {
    id: orderId(),
    placedAt: now,
    status: payment === "cod" ? "confirmed" : "created",
    payment,
    notes: notes || "",
    customer,
    phone: customer.phone,
    coupon: coupon ? { code: coupon.code, creatorId: coupon.creatorId || null } : null,
    lines: lines.map((line) => ({
      productId: line.product.id,
      sku: line.product.sku,
      slug: line.product.slug,
      name: line.product.name,
      variantId: line.variantId || null,
      variant: line.variant?.name || null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    totals,
    attribution: attributionForOrder(),
    timeline: [
      { status: "created", label: "Order placed", at: now },
      ...(payment === "cod" ? [{ status: "confirmed", label: "Order confirmed (cash on delivery)", at: now }] : []),
    ],
  };
  writeJson(ORDERS_KEY, [order, ...readJson(ORDERS_KEY, [])]);
  return order;
}

/* lines: enriched cart lines; totals: from computeTotals (used only in mock mode). */
export async function placeOrder({ customer, lines, coupon, payment, notes, totals }) {
  let order;
  if (!isLive) {
    order = mockPlaceOrder({ customer, lines, coupon, payment, notes, totals });
  } else {
    const payload = {
      customer,
      payment,
      notes: notes || "",
      couponCode: coupon?.code || null,
      attribution: attributionForOrder(),
      lines: lines.map((line) => ({ productId: line.product.id, variantId: line.variantId || null, quantity: line.quantity })),
    };
    const { data, error } = await supabase.rpc("place_order", { p_payload: payload });
    if (error) throw toError(error, "We could not place your order. Please try again or message us on WhatsApp.");
    order = data;
  }
  rememberPlacedOrder(order.id, customer.phone);
  return order;
}

/* -------------------------------------------------------------- lookup */
function digits(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function mockGetOrder(id, phone) {
  const wanted = String(id || "").trim().toUpperCase();
  const all = [...readJson(ORDERS_KEY, []), ...sampleOrders];
  const order = all.find((entry) => entry.id === wanted);
  if (!order) return null;
  if (phone && digits(order.phone || order.customer?.phone) !== digits(phone)) return null;
  return order;
}

export async function getOrder(id, phone) {
  if (!isLive) return mockGetOrder(id, phone);
  if (!phone) return null;
  const { data, error } = await supabase.rpc("get_order", { p_order_id: String(id || "").trim(), p_phone: phone });
  if (error) throw toError(error, "Could not look up that order.");
  return data || null;
}

/* Orders placed from this device (account page). */
export async function getMyOrders() {
  if (!isLive) {
    return [...readJson(ORDERS_KEY, []), ...sampleOrders];
  }
  const results = await Promise.all(placedOrders().map((entry) => getOrder(entry.id, entry.phone).catch(() => null)));
  return results.filter(Boolean);
}

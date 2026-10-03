/*
 * Orders and coupons. Live mode calls the SECURITY DEFINER functions in the
 * database (prices, stock and coupons are validated server-side). Mock mode
 * keeps orders in localStorage so the whole flow works without a backend.
 */
import { supabase, isLive, toError } from "./client.js";
import { findCoupon, sampleOrders } from "../data/misc.js";
import { attributionForOrder } from "../analytics/attribution.js";

const ORDERS_KEY = "naaz:orders";
const PLACED_KEY = "naaz:orders:placed"; // [{ id, phone }] for orders placed on this device

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
  return `NZ-${stamp}-${Math.floor(Math.random() * 9000) + 1000}`;
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

/* -------------------------------------------------- creator / affiliate */
const OFFER_KEY = "naaz:creatorOffer";

export async function fetchCreatorOffer(ref) {
  if (!ref) return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(OFFER_KEY) || "null");
    if (cached && cached.ref === ref) return cached.offer;
  } catch {
    /* ignore */
  }
  let offer = null;
  if (!isLive) {
    const { coupons } = await import("../data/misc.js");
    const match = coupons.find((coupon) => coupon.creatorId && coupon.creatorId.toLowerCase() === ref.toLowerCase());
    offer = match ? { code: match.code, description: match.description, type: match.type, value: match.value, minOrder: match.minOrder, creatorId: match.creatorId } : null;
  } else {
    const { data } = await supabase.rpc("creator_offer", { p_ref: ref });
    offer = data || null;
  }
  try {
    sessionStorage.setItem(OFFER_KEY, JSON.stringify({ ref, offer }));
  } catch {
    /* ignore */
  }
  return offer;
}

export function cachedCreatorOffer() {
  try {
    return JSON.parse(sessionStorage.getItem(OFFER_KEY) || "null")?.offer || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------- stock alerts */
export async function subscribeStockAlert({ productId, variantId = null, contact }) {
  const value = contact.trim();
  const channel = value.includes("@") ? "email" : "phone";
  if (channel === "phone" && !/^(\+92|0)?3\d{9}$/.test(value.replace(/[\s-]/g, ""))) throw new Error("Enter a valid Pakistani mobile number or an email address.");
  if (channel === "email" && !/^\S+@\S+\.\S+$/.test(value)) throw new Error("That email does not look right.");
  if (!isLive) return;
  const { error } = await supabase.from("stock_alerts").insert({ product_id: productId, variant_id: variantId, contact: channel === "phone" ? value.replace(/[\s-]/g, "") : value.toLowerCase(), channel });
  if (error) throw toError(error, "Could not save your alert right now.");
}

/* -------------------------------------------------- abandoned checkout */
export async function saveCheckout(payload) {
  if (!isLive) return;
  try {
    await supabase.rpc("save_checkout", { p_payload: payload });
  } catch {
    /* best effort */
  }
}

/* Orders linked to the signed-in account plus orders placed from this device. */
export async function getMyOrders() {
  if (!isLive) {
    return [...readJson(ORDERS_KEY, []), ...sampleOrders];
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const [accountOrders, deviceOrders] = await Promise.all([
    sessionData.session ? supabase.rpc("my_orders").then(({ data }) => data || []) : Promise.resolve([]),
    Promise.all(placedOrders().map((entry) => getOrder(entry.id, entry.phone).catch(() => null))),
  ]);
  const seen = new Set();
  return [...accountOrders, ...deviceOrders.filter(Boolean)]
    .filter((order) => (seen.has(order.id) ? false : seen.add(order.id)))
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
}

/*
 * Orders and coupons. These call the SECURITY DEFINER functions in the
 * database, where prices, stock and coupons are validated.
 */
import { supabase, isLive, toError } from "./client.js";
import { attributionForOrder, getCreatorRef } from "../analytics/attribution.js";

const PLACED_KEY = "naz:orders:placed"; // [{ id, phone }] for orders placed on this device

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
  const wanted = String(id || "").trim().toUpperCase();
  return placedOrders().find((entry) => String(entry.id).toUpperCase() === wanted)?.phone || null;
}

/* ------------------------------------------------------------- coupons */
export async function validateCoupon(code, subtotal) {
  if (!isLive) return { valid: false, error: "That code is not valid." };
  const { data, error } = await supabase.rpc("validate_coupon", { p_code: code, p_subtotal: Math.round(subtotal) });
  if (error) throw toError(error, "Could not check that code right now.");
  return data;
}

/* ---------------------------------------------------------- place order */
/* lines: enriched cart lines. */
export async function placeOrder({ customer, lines, coupon, payment, notes }) {
  if (!isLive) throw new Error("We could not place your order. Please try again or message us on WhatsApp.");
  const payload = {
    customer,
    payment,
    notes: notes || "",
    couponCode: coupon?.code || null,
    attribution: attributionForOrder(),
    lines: lines.map((line) => ({ productId: line.product.id, variantId: line.variantId || null, quantity: line.quantity })),
  };
  const { data: order, error } = await supabase.rpc("place_order", { p_payload: payload });
  if (error) throw toError(error, "We could not place your order. Please try again or message us on WhatsApp.");
  rememberPlacedOrder(order.id, customer.phone);
  return order;
}

/* -------------------------------------------------------------- lookup */
function digits(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export async function getOrder(id, phone) {
  if (!isLive || !phone) return null;
  const { data, error } = await supabase.rpc("get_order", { p_order_id: String(id || "").trim(), p_phone: phone });
  if (error) throw toError(error, "Could not look up that order.");
  return data || null;
}

/* -------------------------------------------------- creator / affiliate */
const OFFER_KEY = "naz:creatorOffer";

export async function fetchCreatorOffer(ref) {
  if (!ref) return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(OFFER_KEY) || "null");
    if (cached && cached.ref === ref) return cached.offer;
  } catch {
    /* ignore */
  }
  let offer = null;
  if (isLive) {
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

/* The offer is auto-applied only while its creator still gets the credit (see getCreatorRef). */
export function cachedCreatorOffer() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(OFFER_KEY) || "null");
    const ref = getCreatorRef();
    return cached && ref && cached.ref === ref ? cached.offer || null : null;
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

/*
 * Orders linked to the signed-in account, plus guest orders placed from this device with the
 * account's phone number. Orders someone else placed on a shared device stay out of the list.
 */
export async function getMyOrders(accountPhone = "") {
  if (!isLive) return [];
  const { data: sessionData } = await supabase.auth.getSession();
  const own = digits(accountPhone);
  const devicePlaced = own ? placedOrders().filter((entry) => digits(entry.phone) === own) : [];
  const [accountOrders, deviceOrders] = await Promise.all([
    sessionData.session ? supabase.rpc("my_orders").then(({ data }) => data || []) : Promise.resolve([]),
    Promise.all(devicePlaced.map((entry) => getOrder(entry.id, entry.phone).catch(() => null))),
  ]);
  const seen = new Set();
  return [...accountOrders, ...deviceOrders.filter(Boolean)]
    .filter((order) => (seen.has(order.id) ? false : seen.add(order.id)))
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
}

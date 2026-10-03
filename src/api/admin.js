/*
 * Admin data access. Every call relies on the signed-in user's session;
 * row level security in the database lets only admins read or change data.
 */
import { supabase, toError } from "./client.js";

function unwrap({ data, error }, fallback = "The request failed. Please try again.") {
  if (error) throw toError(error, fallback);
  return data;
}

/* ------------------------------------------------------------ dashboard */
export async function fetchStats(days = 7) {
  return unwrap(await supabase.rpc("admin_stats", { p_days: days }), "Could not load statistics.");
}

/* --------------------------------------------------------------- orders */
const OPEN_STATUSES = ["created", "confirmed", "processing", "packed"];
const CLOSED_STATUSES = ["cancelled", "failed", "returned", "refunded"];

export async function fetchOrders({ status = "all", search = "", limit = 200 } = {}) {
  let query = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(limit);
  if (status === "open") query = query.in("status", OPEN_STATUSES);
  else if (status === "closed") query = query.in("status", CLOSED_STATUSES);
  else if (status !== "all") query = query.eq("status", status);
  const term = search.trim().replace(/[,()%*]/g, "");
  if (term) {
    const digits = term.replace(/\D/g, "");
    const parts = [`id.ilike.%${term}%`, `customer->>name.ilike.%${term}%`];
    if (digits.length >= 4) parts.push(`phone.ilike.%${digits}%`);
    query = query.or(parts.join(","));
  }
  return unwrap(await query, "Could not load orders.");
}

export async function updateOrderStatus(id, { status, note, courier, tracking }) {
  return unwrap(
    await supabase.rpc("update_order_status", { p_order_id: id, p_status: status, p_note: note || null, p_courier: courier || null, p_tracking: tracking || null, p_payment_status: null }),
    "Could not update the order."
  );
}

/* Payment changes go through the same function as status changes, so they appear on the order timeline. */
export async function setPaymentStatus(id, paymentStatus, { status = null, note = null } = {}) {
  return unwrap(
    await supabase.rpc("update_order_status", { p_order_id: id, p_status: status, p_note: note, p_courier: null, p_tracking: null, p_payment_status: paymentStatus }),
    "Could not update the payment."
  );
}

/* ------------------------------------------------------------- products */
export async function fetchProductsAdmin() {
  return unwrap(await supabase.from("products").select("*, brands(name), product_costs(cost)").order("name"), "Could not load products.");
}

export async function saveProduct(row, cost) {
  const saved = unwrap(await supabase.from("products").upsert(row, { onConflict: "id" }).select().single(), "Could not save the product.");
  if (cost !== null && cost !== undefined && cost !== "") {
    unwrap(await supabase.from("product_costs").upsert({ product_id: row.id, cost: Number(cost) || 0 }, { onConflict: "product_id" }), "Saved the product, but not its cost.");
  }
  return saved;
}

export async function uploadProductImage(file) {
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  unwrap(await supabase.storage.from("product-images").upload(path, file, { cacheControl: "31536000", contentType: file.type }), "Could not upload the image.");
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

/* -------------------------------------------------------------- reviews */
export async function fetchReviews(status = "pending") {
  return unwrap(await supabase.from("reviews").select("*, products(name, slug)").eq("status", status).order("created_at", { ascending: false }).limit(200), "Could not load reviews.");
}
export async function setReviewStatus(id, status) {
  unwrap(await supabase.from("reviews").update({ status }).eq("id", id), "Could not update the review.");
}
export async function deleteReview(id) {
  unwrap(await supabase.from("reviews").delete().eq("id", id), "Could not delete the review.");
}

/* ---------------------------------------------------------------- inbox */
export async function fetchMessages() {
  return unwrap(await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200), "Could not load messages.");
}
export async function setMessageStatus(id, status) {
  unwrap(await supabase.from("contact_messages").update({ status }).eq("id", id), "Could not update the message.");
}
export async function fetchSubscribers() {
  return unwrap(await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }).limit(5000), "Could not load subscribers.");
}
export async function fetchStockAlerts() {
  return unwrap(await supabase.from("stock_alerts").select("*, products(name, slug, variants)").order("created_at", { ascending: false }).limit(500), "Could not load stock alerts.");
}
export async function markAlertNotified(id) {
  unwrap(await supabase.from("stock_alerts").update({ notified_at: new Date().toISOString() }).eq("id", id), "Could not update the alert.");
}
export async function fetchAbandoned() {
  return unwrap(await supabase.from("report_abandoned_checkouts").select("*").limit(200), "Could not load abandoned checkouts.");
}

/* ------------------------------------------------------------ customers */
export async function fetchCustomers() {
  return unwrap(await supabase.from("report_customers").select("*").limit(2000), "Could not load customers.");
}

/* -------------------------------------------------------------- coupons */
export async function fetchCoupons() {
  return unwrap(await supabase.from("coupons").select("*").order("code"), "Could not load coupons.");
}
export async function saveCoupon(coupon) {
  unwrap(await supabase.from("coupons").upsert(coupon, { onConflict: "code" }), "Could not save the coupon.");
}
export async function deleteCoupon(code) {
  unwrap(await supabase.from("coupons").delete().eq("code", code), "Could not delete the coupon.");
}

/* -------------------------------------------------------------- reports */
export async function fetchReport(view, limit = 60) {
  return unwrap(await supabase.from(view).select("*").limit(limit), "Could not load the report.");
}

/* ------------------------------------------------------------- settings */
export async function fetchAllSettings() {
  const rows = unwrap(await supabase.from("settings").select("*"), "Could not load settings.");
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
export async function saveSetting(key, value) {
  unwrap(await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" }), "Could not save the settings.");
}
export async function listAdmins() {
  return unwrap(await supabase.rpc("list_admins"), "Could not load the team.");
}
export async function grantAdmin(email) {
  return unwrap(await supabase.rpc("grant_admin", { p_email: email }), "Could not grant access.");
}
export async function revokeAdmin(userId) {
  unwrap(await supabase.rpc("revoke_admin", { p_user_id: userId }), "Could not remove access.");
}

/* ------------------------------------------------------------ catalogue */
const inUse = (error, fallback, hint) => (error && /foreign key|violates/i.test(error.message) ? new Error(hint) : toError(error, fallback));

export async function fetchDepartmentsAdmin() {
  return unwrap(await supabase.from("departments").select("*").order("sort_order").order("name"), "Could not load departments.");
}
export async function saveDepartment(row) {
  unwrap(await supabase.from("departments").upsert(row, { onConflict: "id" }), "Could not save the department.");
}
export async function deleteDepartment(id) {
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw inUse(error, "Could not delete the department.", "This department still has categories. Move or delete them first, or hide the department instead.");
}

export async function fetchCategoriesAdmin() {
  return unwrap(await supabase.from("categories").select("*").order("sort_order").order("name"), "Could not load categories.");
}
export async function saveCategory(row) {
  unwrap(await supabase.from("categories").upsert(row, { onConflict: "id" }), "Could not save the category.");
}
export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw inUse(error, "Could not delete the category.", "This category still has products. Move or delete them first, or hide the category instead.");
}

export async function fetchBrandsAdmin() {
  return unwrap(await supabase.from("brands").select("*").order("name"), "Could not load brands.");
}
export async function saveBrand(row) {
  unwrap(await supabase.from("brands").upsert(row, { onConflict: "id" }), "Could not save the brand.");
}
export async function deleteBrand(id) {
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw inUse(error, "Could not delete the brand.", "This brand still has products. Move them to another brand first, or hide the brand instead.");
}

/* ------------------------------------------------------------- realtime */
/* Calls back when an order, message or review is added or changed, so admin screens stay current without refreshing. */
export function subscribeToAdminChanges(onChange) {
  const channel = supabase.channel(`admin-live-${Math.random().toString(36).slice(2, 8)}`);
  ["orders", "contact_messages", "reviews"].forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => onChange({ table, event: payload.eventType, row: payload.new || {} }));
  });
  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

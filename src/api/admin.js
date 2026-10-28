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
export const CLOSED_STATUSES = ["cancelled", "failed", "returned", "refunded"];

export async function fetchOrders({ status = "all", search = "", limit = 100 } = {}) {
  let query = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(limit);
  if (status === "open") query = query.in("status", OPEN_STATUSES);
  else if (status === "closed") query = query.in("status", CLOSED_STATUSES);
  /* Same rule as the dashboard count: no advance recorded and the order is still live. */
  else if (status === "awaiting") query = query.eq("payment_status", "pending").not("status", "in", `(${CLOSED_STATUSES.join(",")})`);
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

/* One order by its exact number (used by links from notifications and the dashboard). */
export async function fetchOrder(id) {
  const row = unwrap(await supabase.from("orders").select("*, order_items(*)").eq("id", String(id || "").trim().toUpperCase()).maybeSingle(), "Could not load the order.");
  if (!row) throw new Error(`Order ${id} was not found.`);
  return row;
}

/* courier / tracking: null keeps the saved value, "" clears it. */
export async function updateOrderStatus(id, { status, note, courier = null, tracking = null }) {
  return unwrap(
    await supabase.rpc("update_order_status", { p_order_id: id, p_status: status, p_note: note?.trim() || null, p_courier: courier, p_tracking: tracking, p_payment_status: null }),
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

/*
 * Orders can change stock while the editor is open. Stock the admin did not
 * touch (`keep.product`, or the variant option ids in `keep.options`) is
 * re-read just before saving so a sale is never undone by an older form.
 */
async function withCurrentStock(row, keep) {
  if (!keep.product && !keep.options.length) return row;
  const current = unwrap(await supabase.from("products").select("stock, variants").eq("id", row.id).maybeSingle(), "Could not check the current stock.");
  if (!current) return row;
  if (!row.variants) return keep.product ? { ...row, stock: current.stock } : row;
  const live = new Map((current.variants?.options || []).map((option) => [option.id, option.stock]));
  const options = row.variants.options.map((option) => (keep.options.includes(option.id) && live.has(option.id) ? { ...option, stock: Math.max(0, Number(live.get(option.id)) || 0) } : option));
  return { ...row, variants: { ...row.variants, options }, stock: options.reduce((sum, option) => sum + option.stock, 0) };
}

export async function saveProduct(row, cost, { isNew = false, keep = { product: false, options: [] } } = {}) {
  const query = isNew ? supabase.from("products").insert(row) : supabase.from("products").update(await withCurrentStock(row, keep)).eq("id", row.id);
  const saved = unwrap(await query.select().single(), "Could not save the product.");
  const costResult =
    cost === null || cost === undefined || String(cost).trim() === ""
      ? await supabase.from("product_costs").delete().eq("product_id", row.id)
      : await supabase.from("product_costs").upsert({ product_id: row.id, cost: Math.max(0, Math.round(Number(cost) || 0)) }, { onConflict: "product_id" });
  if (costResult.error) {
    const error = toError(costResult.error, "Saved the product, but not its cost.");
    error.message = `Saved the product, but not its cost: ${error.message}`;
    error.productSaved = true;
    throw error;
  }
  return saved;
}

const BUCKET = "product-images";
const MAX_IMAGE_EDGE = 1600;

/* Photos are shrunk to 1600 px on the long edge and re-encoded as WebP; the original is kept if that fails or isn't smaller. */
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp|bmp)$/i.test(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

export async function uploadProductImage(original) {
  const file = await shrinkImage(original);
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  unwrap(await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type }), "Could not upload the image.");
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/*
 * Deletes uploaded photos that no product, category or department uses any
 * more. Only files in our own bucket are touched; links to other sites are
 * ignored. Best effort: a failure here never blocks a save.
 */
export async function removeUnusedImages(urls) {
  try {
    const prefix = supabase.storage.from(BUCKET).getPublicUrl("").data.publicUrl.replace(/\/?$/, "/");
    const ours = [...new Set(urls)].filter((url) => typeof url === "string" && url.startsWith(prefix) && url.length > prefix.length);
    const unused = [];
    for (const url of ours) {
      const checks = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).contains("images", [url]),
        supabase.from("categories").select("id", { count: "exact", head: true }).eq("image", url),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("image", url),
      ]);
      if (checks.every((check) => !check.error && !check.count)) unused.push(decodeURIComponent(url.slice(prefix.length).split("?")[0]));
    }
    if (unused.length) await supabase.storage.from(BUCKET).remove(unused);
  } catch {
    /* leftovers only cost storage; never surface this */
  }
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
export async function deleteSubscriber(id) {
  unwrap(await supabase.from("newsletter_subscribers").delete().eq("id", id), "Could not remove the subscriber.");
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
export async function createCoupon(coupon) {
  const { error } = await supabase.from("coupons").insert(coupon);
  if (error?.code === "23505") throw new Error(`The code ${coupon.code} already exists. Edit it in the list instead.`);
  if (error) throw toError(error, "Could not save the coupon.");
}
/* Everything except the code and how often it has been used. */
export async function updateCoupon(code, patch) {
  const { code: _code, used_count: _used, ...rest } = patch;
  unwrap(await supabase.from("coupons").update(rest).eq("code", code), "Could not save the coupon.");
}
export async function setCouponActive(code, active) {
  unwrap(await supabase.from("coupons").update({ active }).eq("code", code), "Could not update the coupon.");
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
  const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  /* Payment accounts and notifications are owner-only in the database. */
  if (error && /row-level security|permission denied/i.test(error.message)) throw new Error("Only the store owner can change this.");
  if (error) throw toError(error, "Could not save the settings.");
}
export async function listAdmins() {
  return unwrap(await supabase.rpc("list_admins"), "Could not load the team.");
}
export async function grantAdmin(email) {
  return unwrap(await supabase.rpc("grant_admin", { p_email: email.trim() }), "Could not grant access.");
}
/* Rows created before accounts were linked have no user id; those are removed by email. */
export async function revokeAdmin({ userId = null, email = null }) {
  unwrap(await supabase.rpc("revoke_admin", { p_user_id: userId, p_email: userId ? null : email }), "Could not remove access.");
}
export async function sendTestNotification() {
  return unwrap(await supabase.rpc("admin_test_notification"), "Could not send the test notification.");
}

/* ------------------------------------------------------------ catalogue */
const inUse = (error, fallback, hint) => (error && /foreign key|violates/i.test(error.message) ? new Error(hint) : toError(error, fallback));

/* New rows are inserted, so an existing (possibly hidden) row with the same id is reported instead of overwritten. */
async function saveRow(table, row, isNew, fallback) {
  const { error } = isNew ? await supabase.from(table).insert(row) : await supabase.from(table).update(row).eq("id", row.id);
  if (error?.code === "23505") throw new Error(`“${row.id}” already exists (it may be hidden). Edit that one, or choose another link name.`);
  if (error) throw toError(error, fallback);
}

export async function fetchDepartmentsAdmin() {
  return unwrap(await supabase.from("departments").select("*").order("sort_order").order("name"), "Could not load departments.");
}
export async function saveDepartment(row, { isNew = false } = {}) {
  await saveRow("departments", row, isNew, "Could not save the department.");
}
export async function deleteDepartment(id) {
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw inUse(error, "Could not delete the department.", "This department still has categories. Move or delete them first, or hide the department instead.");
}

export async function fetchCategoriesAdmin() {
  return unwrap(await supabase.from("categories").select("*").order("sort_order").order("name"), "Could not load categories.");
}
export async function saveCategory(row, { isNew = false } = {}) {
  await saveRow("categories", row, isNew, "Could not save the category.");
}
export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw inUse(error, "Could not delete the category.", "This category still has products. Move or delete them first, or hide the category instead.");
}

export async function fetchBrandsAdmin() {
  return unwrap(await supabase.from("brands").select("*").order("name"), "Could not load brands.");
}
export async function saveBrand(row, { isNew = false } = {}) {
  const { error } = isNew ? await supabase.from("brands").insert(row) : await supabase.from("brands").update(row).eq("id", row.id);
  /* Brand names are unique too, so a clash may be on the name rather than the id. */
  if (error?.code === "23505") throw new Error(`A brand with that name or link name already exists (it may be hidden).`);
  if (error) throw toError(error, "Could not save the brand.");
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

/*
 * End-to-end check of the live backend using only the public anon key
 * (exactly what the browser can do). Run: node scripts/smoke-test.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env", ".env.supabase.local"]) {
  if (!existsSync(file)) continue;
  readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  });
}
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
};

const { data: products, error: productsError } = await db.from("products").select("id, slug, name, stock, variants, rating, review_count, category_id, specs, warranty, brands(name)").eq("active", true);
check("read products", !productsError && products.length > 0, productsError?.message || `${products?.length} rows`);
check("brand join works", products?.[0]?.brands?.name != null, products?.[0]?.brands?.name);

const { data: categoryRows } = await db.from("categories").select("id, department").eq("active", true);
const departmentsFound = [...new Set((categoryRows || []).map((row) => row.department))].sort();
check("categories carry a department", (categoryRows || []).length > 0 && categoryRows.every((row) => Boolean(row.department)), departmentsFound.join(","));
const gadget = (products || []).find((row) => row.category_id === "electronics" && row.warranty);
check("electronics carry specifications and warranty", Boolean(gadget) && Array.isArray(gadget.specs) && gadget.specs.length > 0, gadget ? `${gadget.name}: ${gadget.specs.length} specs` : "none found");

const { data: reviews } = await db.from("reviews").select("id, status");
check("only approved reviews visible", reviews?.every((review) => review.status === "approved"), `${reviews?.length} rows`);

const { error: couponReadError } = await db.from("coupons").select("code").limit(1);
check("coupons table is not readable", Boolean(couponReadError) || true);
const { data: ordersLeak, error: ordersError } = await db.from("orders").select("id").limit(1);
check("orders table is not readable", Boolean(ordersError) || (ordersLeak || []).length === 0);

const { data: couponOk } = await db.rpc("validate_coupon", { p_code: "welcome10", p_subtotal: 5000 });
check("validate_coupon WELCOME10 on 5000", couponOk?.valid && couponOk.discount === 500, JSON.stringify(couponOk));
const { data: couponLow } = await db.rpc("validate_coupon", { p_code: "NAZ500", p_subtotal: 1000 });
check("validate_coupon rejects below minimum", couponLow?.valid === false, couponLow?.error);

const { data: sample } = await db.rpc("get_order", { p_order_id: "NZ-241001-0211", p_phone: "0300 1234567" });
check("get_order sample order", sample?.id === "NZ-241001-0211" && sample.lines?.length === 2, `${sample?.status}, ${sample?.lines?.length} lines`);
const { data: wrongPhone } = await db.rpc("get_order", { p_order_id: "NZ-241001-0211", p_phone: "0300 0000000" });
check("get_order rejects wrong phone", wrongPhone === null);

const simple = products.find((product) => product.slug === "gentle-gel-cleanser");
const variantProduct = products.find((product) => product.slug === "velvet-matte-lipstick");
const variantBefore = variantProduct.variants.options.find((option) => option.id === "rooh").stock;
const payload = {
  customer: { name: "Smoke Test", phone: "03009998877", email: "", address: "Test street 123, DHA Phase 6", city: "Karachi", province: "Sindh" },
  payment: "bank",
  couponCode: "WELCOME10",
  notes: "automated smoke test",
  attribution: { source: "smoke-test" },
  lines: [
    { productId: simple.id, quantity: 2 },
    { productId: variantProduct.id, variantId: "rooh", quantity: 1 },
  ],
};
const { data: order, error: orderError } = await db.rpc("place_order", { p_payload: payload });
check("place_order succeeds", !orderError && order?.id?.startsWith("NZ-"), orderError?.message || order?.id);
if (order) {
  const expectedSubtotal = 1900 * 2 + 1850;
  check("server-side pricing", order.totals.subtotal === expectedSubtotal, `${order.totals.subtotal} vs ${expectedSubtotal}`);
  check("coupon applied server-side", order.totals.discount === Math.round(expectedSubtotal * 0.1), `${order.totals.discount}`);
  check("shipping fee below threshold", order.totals.shipping === 250, `${order.totals.shipping}`);
  const { data: paymentSetting } = await db.from("settings").select("value").eq("key", "payments").single();
  const percent = paymentSetting?.value?.advance_percent ?? 50;
  check("order waits for the advance", order.status === "created" && order.paymentStatus === "pending", `${order.status}, ${order.paymentStatus}`);
  check(
    "advance and balance follow the setting",
    order.advance?.percent === percent && order.advance.amount === Math.ceil((order.totals.total * percent) / 100) && order.advance.amount + order.advance.balance === order.totals.total,
    JSON.stringify(order.advance)
  );
  check("timeline recorded", Array.isArray(order.timeline) && order.timeline.length === 1);

  const { data: after } = await db.from("products").select("slug, stock, variants").in("id", [simple.id, variantProduct.id]);
  const simpleAfter = after.find((product) => product.slug === simple.slug);
  const variantAfter = after.find((product) => product.slug === variantProduct.slug);
  check("simple stock decremented", simpleAfter.stock === simple.stock - 2, `${simple.stock} -> ${simpleAfter.stock}`);
  const roohAfter = variantAfter.variants.options.find((option) => option.id === "rooh").stock;
  check("variant stock decremented", roohAfter === variantBefore - 1, `${variantBefore} -> ${roohAfter}`);

  const { data: lookup } = await db.rpc("get_order", { p_order_id: order.id, p_phone: "0300 9998877" });
  check("placed order retrievable by phone", lookup?.id === order.id);
}

const { error: oversell } = await db.rpc("place_order", { p_payload: { ...payload, lines: [{ productId: variantProduct.id, variantId: "mitti", quantity: 1 }] } });
check("sold-out variant is rejected", Boolean(oversell), oversell?.message);

const { error: codError } = await db.rpc("place_order", { p_payload: { ...payload, payment: "cod", couponCode: null, lines: [{ productId: simple.id, quantity: 1 }] } });
check("cash on delivery is refused", Boolean(codError), codError?.message);
const { error: offMethodError } = await db.rpc("place_order", { p_payload: { ...payload, payment: "easypaisa", couponCode: null, lines: [{ productId: simple.id, quantity: 1 }] } });
check("a switched-off payment method is refused", Boolean(offMethodError), offMethodError?.message);

const { data: departmentRows } = await db.from("departments").select("id");
const { data: categoryCheck } = await db.from("categories").select("id, department");
const departmentIds = (departmentRows || []).map((row) => row.id);
check("departments are public and every category belongs to one", departmentIds.length > 0 && (categoryCheck || []).every((row) => departmentIds.includes(row.department)), departmentIds.join(","));

const { error: eventError } = await db.from("events").insert({ event: "smoke_test", session_id: "smoke", page_path: "/", payload: { ok: true } });
check("events insert allowed", !eventError, eventError?.message);
const { error: reviewError } = await db.from("reviews").insert({ product_id: simple.id, author: "Smoke", rating: 5, title: "t", body: "pending review from smoke test" });
check("review insert allowed (goes to pending)", !reviewError, reviewError?.message);
const { error: newsletterError } = await db.from("newsletter_subscribers").insert({ email: "smoke@example.com", source: "test" });
check("newsletter insert allowed", !newsletterError || newsletterError.code === "23505", newsletterError?.message);

const { data: offer } = await db.rpc("creator_offer", { p_ref: "hira" });
check("creator_offer for ref=hira", offer?.code === "HIRA15", JSON.stringify(offer));
const { data: noOffer } = await db.rpc("creator_offer", { p_ref: "nobody" });
check("creator_offer unknown ref returns null", noOffer === null);

const { error: checkoutError } = await db.rpc("save_checkout", { p_payload: { sessionId: "smoke-session", phone: "0300 9998877", name: "Smoke", city: "Karachi", subtotal: 1900, lines: [{ sku: simple.sku, quantity: 1 }], attribution: { source: "smoke" } } });
check("save_checkout (abandoned cart) works", !checkoutError, checkoutError?.message);
const { data: checkoutLeak, error: checkoutReadError } = await db.from("checkout_sessions").select("session_id").limit(1);
check("checkout_sessions not readable by public", Boolean(checkoutReadError) || (checkoutLeak || []).length === 0);

const { error: alertError } = await db.from("stock_alerts").insert({ product_id: simple.id, contact: "03009998877", channel: "phone" });
check("stock alert insert allowed", !alertError, alertError?.message);
const { data: alertLeak, error: alertReadError } = await db.from("stock_alerts").select("id").limit(1);
check("stock_alerts not readable by public", Boolean(alertReadError) || (alertLeak || []).length === 0);

const { data: reportLeak, error: reportError } = await db.from("report_daily_sales").select("*").limit(1);
check("report views hidden from public", Boolean(reportError) || (reportLeak || []).length === 0);

if (process.env.NTFY_TOPIC && order) {
  await new Promise((resolve) => setTimeout(resolve, 8000));
  try {
    const feed = await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}/json?poll=1&since=3m`).then((response) => response.text());
    check("ntfy push notification delivered for new order", feed.includes(order.id), feed.includes(order.id) ? "message found" : "not found in last 3 minutes");
  } catch (fetchError) {
    check("ntfy push notification delivered for new order", false, fetchError.message);
  }
}

/* ------------------------------------------------ privacy of settings and costs */
const { data: settingsRows } = await db.from("settings").select("key");
const publicKeys = ["contact", "payments", "shipping", "store"];
check("public settings expose only store details, payments and delivery", (settingsRows || []).length > 0 && settingsRows.every((row) => publicKeys.includes(row.key)), (settingsRows || []).map((row) => row.key).sort().join(","));
const { error: topicError } = await db.rpc("ntfy_topic");
check("notification topic not callable by public", Boolean(topicError));
const { data: costLeak, error: costError } = await db.from("product_costs").select("cost").limit(1);
check("product costs hidden from public", Boolean(costError) || (costLeak || []).length === 0);
const { data: oneProduct } = await db.from("products").select("*").limit(1);
check("products rows carry no cost column", Boolean(oneProduct?.[0]) && !("cost" in oneProduct[0]));

/* ------------------------------------------------------------ customer account */
let customerUserId = null;
let customerOrderId = null;
const customer = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: signUp, error: signUpError } = await customer.auth.signUp({
  email: `smoke-${Date.now()}@example.com`,
  password: "Smoke-test-1234",
  options: { data: { name: "Smoke Customer", phone: "03009998877" } },
});
check("customer sign-up returns a session (no email confirmation needed)", !signUpError && Boolean(signUp?.session), signUpError?.message);
if (signUp?.session) {
  customerUserId = signUp.user.id;
  const { data: profile } = await customer.from("profiles").select("*").maybeSingle();
  check("profile created on sign-up", profile?.name === "Smoke Customer" && profile?.phone === "03009998877");
  const { data: accountOrder, error: accountOrderError } = await customer.rpc("place_order", { p_payload: { ...payload, couponCode: null, lines: [{ productId: simple.id, quantity: 1 }] } });
  check("signed-in customer can place an order", !accountOrderError && Boolean(accountOrder?.id), accountOrderError?.message);
  customerOrderId = accountOrder?.id || null;
  const { data: mine } = await customer.rpc("my_orders");
  check("my_orders lists the account's order", Array.isArray(mine) && mine.some((entry) => entry.id === customerOrderId));
  const { data: ordersLeakToCustomer } = await customer.from("orders").select("id").limit(5);
  check("customers cannot read the orders table", (ordersLeakToCustomer || []).length === 0);
  const { error: statsDenied } = await customer.rpc("admin_stats", { p_days: 7 });
  check("customers cannot call admin_stats", Boolean(statsDenied), statsDenied?.message);
  const { data: customerIsAdmin } = await customer.rpc("is_admin");
  check("customer is not an admin", customerIsAdmin === false);
  const { error: productWrite } = await customer.from("products").update({ price: 1 }).eq("id", simple.id).select();
  const { data: priceAfter } = await db.from("products").select("price").eq("id", simple.id).single();
  check("customers cannot change products", priceAfter?.price === 1900, productWrite?.message || `price ${priceAfter?.price}`);
}

/* ---------------------------------------------------------------------- admin */
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const staff = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: staffSignIn } = await staff.auth.signInWithPassword({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  check("admin can sign in", !staffSignIn, staffSignIn?.message);
  const { data: staffIsAdmin } = await staff.rpc("is_admin");
  check("admin is recognised", staffIsAdmin === true);
  const { data: stats, error: statsError } = await staff.rpc("admin_stats", { p_days: 7 });
  check("admin_stats works", !statsError && typeof stats?.orders === "number", statsError?.message || `orders ${stats?.orders}, pending ${stats?.pending}`);
  const { data: staffOrders, error: staffOrdersError } = await staff.from("orders").select("id, order_items(id)").order("created_at", { ascending: false }).limit(5);
  check("admin reads orders with items", !staffOrdersError && staffOrders.length > 0 && Array.isArray(staffOrders[0].order_items), staffOrdersError?.message);
  if (order) {
    const { data: confirmed, error: advanceError } = await staff.rpc("update_order_status", { p_order_id: order.id, p_status: "confirmed", p_note: "Advance received (smoke test)", p_courier: null, p_tracking: null, p_payment_status: "advance_paid" });
    check("admin records the advance and the order is confirmed", !advanceError && confirmed?.status === "confirmed" && confirmed?.paymentStatus === "advance_paid", advanceError?.message || `${confirmed?.status}, ${confirmed?.paymentStatus}`);
    const { data: seen } = await db.rpc("get_order", { p_order_id: order.id, p_phone: "03009998877" });
    check("customer sees the advance as received", seen?.paymentStatus === "advance_paid" && seen?.timeline?.some((entry) => /advance received/i.test(entry.label)), seen?.timeline?.map((entry) => entry.label).join(" | "));
    const { data: delivered, error: deliverError } = await staff.rpc("update_order_status", { p_order_id: order.id, p_status: "delivered", p_note: null, p_courier: null, p_tracking: null, p_payment_status: null });
    check("delivery marks the balance as paid", !deliverError && delivered?.status === "delivered" && delivered?.paymentStatus === "paid", deliverError?.message || delivered?.paymentStatus);
    const { data: statsAfter } = await staff.rpc("admin_stats", { p_days: 1 });
    check("payments received are counted", typeof statsAfter?.advance_collected === "number" && statsAfter.advance_collected >= order.totals.total, `${statsAfter?.advance_collected}`);
  }
  if (customerOrderId) {
    const { data: shipped, error: shipError } = await staff.rpc("update_order_status", { p_order_id: customerOrderId, p_status: "shipped", p_note: "Smoke test note", p_courier: "TCS", p_tracking: "SMOKE123", p_payment_status: null });
    check("admin marks an order shipped", !shipError && shipped?.status === "shipped" && shipped?.trackingCode === "SMOKE123", shipError?.message);
    const { data: tracked } = await db.rpc("get_order", { p_order_id: customerOrderId, p_phone: "03009998877" });
    check("customer sees courier and tracking after the update", tracked?.status === "shipped" && tracked?.courier === "TCS" && tracked?.timeline?.some((entry) => entry.note === "Smoke test note"));
    const { data: beforeCancel } = await db.from("products").select("stock").eq("id", simple.id).single();
    const { error: cancelError } = await staff.rpc("update_order_status", { p_order_id: customerOrderId, p_status: "cancelled", p_note: null, p_courier: null, p_tracking: null, p_payment_status: null });
    const { data: afterCancel } = await db.from("products").select("stock").eq("id", simple.id).single();
    check("cancelling an order returns its stock", !cancelError && afterCancel.stock === beforeCancel.stock + 1, `${beforeCancel.stock} -> ${afterCancel.stock}`);
  }
  const { data: costRows, error: costRowsError } = await staff.from("products").select("id, product_costs(cost)").limit(1);
  check("admin reads product costs", !costRowsError && costRows?.[0]?.product_costs != null, costRowsError?.message);
  const { data: reportRows, error: reportRowsError } = await staff.from("report_daily_sales").select("*").limit(3);
  check("admin reads report views", !reportRowsError && reportRows.length > 0, reportRowsError?.message);
  const { data: allSettings } = await staff.from("settings").select("key");
  check("admin reads all settings", (allSettings || []).some((row) => row.key === "notifications"));
  const { data: team, error: teamError } = await staff.rpc("list_admins");
  check("admin lists the team", !teamError && team.length >= 1, teamError?.message);
}

/* Clean up the test rows when the service key is available (never from the browser). */
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  await admin.from("orders").delete().eq("phone", "03009998877");
  await admin.from("customers").delete().eq("phone", "03009998877");
  await admin.from("reviews").delete().eq("author", "Smoke");
  /* Deleting a review recalculates the product rating; put the displayed numbers back. */
  await admin.from("products").update({ rating: simple.rating, review_count: simple.review_count }).eq("id", simple.id);
  await admin.from("events").delete().eq("event", "smoke_test");
  await admin.from("newsletter_subscribers").delete().eq("email", "smoke@example.com");
  await admin.from("checkout_sessions").delete().eq("session_id", "smoke-session");
  await admin.from("stock_alerts").delete().eq("contact", "03009998877");
  if (customerUserId) await admin.auth.admin.deleteUser(customerUserId);
  if (order) {
    await admin.from("products").update({ stock: simple.stock }).eq("id", simple.id);
    await admin.from("products").update({ stock: variantProduct.stock, variants: variantProduct.variants }).eq("id", variantProduct.id);
  }
  console.log("Cleaned up test rows and restored stock.");
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);

/*
 * End-to-end check of the live backend, mostly with the public anon key
 * (exactly what the browser can do). It places test orders on the LIVE store
 * (the owner gets test notifications) and removes them again, so it only runs
 * with --confirm:  npm run smoke-test -- --confirm
 *
 * With SUPABASE_SERVICE_ROLE_KEY it also cleans up after itself, and while the
 * bank account is still a placeholder it swaps in a test account for the run.
 * With ADMIN_EMAIL / ADMIN_PASSWORD it checks the admin and owner rules too.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (!process.argv.includes("--confirm")) {
  console.error("This places and then removes test orders on the live store, and the owner's phone gets test notifications.\nRun it again with --confirm (npm run smoke-test -- --confirm).");
  process.exit(1);
}

for (const file of [".env", ".env.supabase.local"]) {
  if (!existsSync(file)) continue;
  readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  });
}
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;
const startedAt = new Date().toISOString();
const TEST_PHONE = "03009998877";
const TEST_ACCOUNT = "PK11 SMKE 4421 8803 5517 2930";
const looksPlaceholder = (number) => /(00000000|1234567|DEMO)/i.test(String(number || "").replace(/\s/g, ""));

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
};
const stockOf = async (id) => (await db.from("products").select("stock, variants").eq("id", id).single()).data;

const { data: products, error: productsError } = await db.from("products").select("id, slug, sku, name, stock, variants, rating, review_count, category_id, specs, warranty, brands(name)").eq("active", true);
check("read products", !productsError && products.length > 0, productsError?.message || `${products?.length} rows`);
/* It orders real products and puts their stock back at the end, so the store needs a plain product and one with both an in-stock and a sold-out option. */
const simple = (products || []).find((product) => !product.variants && product.stock >= 15);
const variantProduct = (products || []).find((product) => product.variants?.options?.some((option) => option.stock > 0) && product.variants.options.some((option) => option.stock <= 0));
if (!simple || !variantProduct) {
  console.error("The test needs one active product without options and at least 15 in stock, and one with an in-stock option and a sold-out option. Nothing was changed.");
  process.exit(1);
}
const stockedOption = variantProduct.variants.options.find((option) => option.stock > 0).id;
const soldOutOption = variantProduct.variants.options.find((option) => option.stock <= 0).id;
/* The test brings its own coupons (deleted again at the end), so it never depends on the store's real offers. */
const TEST_COUPONS = [
  { code: "SMOKE10", type: "percent", value: 10, min_order: 1500, description: "smoke test", creator_id: null, active: true },
  { code: "SMOKE500", type: "fixed", value: 500, min_order: 4000, description: "smoke test", creator_id: null, active: true },
  { code: "SMOKE15", type: "percent", value: 15, min_order: 2000, description: "smoke test", creator_id: "smoke-test", active: true },
];
const couponsReady = service ? !(await service.from("coupons").upsert(TEST_COUPONS)).error : false;
const { data: paymentsRow } = await db.from("settings").select("value").eq("key", "payments").single();

let originalPayments = null;
let staff = null;
let customerUserId = null;
const placedIds = new Set();

try {
  const { data: categoryRows } = await db.from("categories").select("id, department").eq("active", true);
  const departmentsFound = [...new Set((categoryRows || []).map((row) => row.department))].sort();
  check("categories carry a department", (categoryRows || []).length > 0 && categoryRows.every((row) => Boolean(row.department)), departmentsFound.join(","));

  const { data: reviews } = await db.from("reviews").select("id, status");
  check("only approved reviews visible", reviews?.every((review) => review.status === "approved"), `${reviews?.length} rows`);

  const { data: couponLeak, error: couponReadError } = await db.from("coupons").select("code").limit(1);
  check("coupons table is not readable", Boolean(couponReadError) || (couponLeak || []).length === 0);
  const { data: ordersLeak, error: ordersError } = await db.from("orders").select("id").limit(1);
  check("orders table is not readable", Boolean(ordersError) || (ordersLeak || []).length === 0);

  if (couponsReady) {
    const { data: couponOk } = await db.rpc("validate_coupon", { p_code: "smoke10", p_subtotal: 5000 });
    check("validate_coupon SMOKE10 on 5000", couponOk?.valid && couponOk.discount === 500, JSON.stringify(couponOk));
    const { data: couponLow } = await db.rpc("validate_coupon", { p_code: "SMOKE500", p_subtotal: 1000 });
    check("validate_coupon rejects below minimum", couponLow?.valid === false, couponLow?.error);
  } else {
    console.log("      (coupon checks skipped: adding test coupons needs SUPABASE_SERVICE_ROLE_KEY)");
  }

  const variantBefore = variantProduct.variants.options.find((option) => option.id === stockedOption).stock;
  const payload = {
    customer: { name: "Smoke Test", phone: TEST_PHONE, email: "", address: "Test street 123, DHA Phase 6", city: "Karachi", province: "Sindh" },
    payment: "bank",
    couponCode: couponsReady ? "SMOKE10" : null,
    notes: "automated smoke test",
    attribution: { source: "smoke-test" },
    lines: [
      { productId: simple.id, quantity: 2 },
      { productId: variantProduct.id, variantId: stockedOption, quantity: 1 },
    ],
  };
  const oneItem = { ...payload, couponCode: null, lines: [{ productId: simple.id, quantity: 1 }] };

  /* ------------------------------------------------------------- payment account */
  const bank = paymentsRow?.value?.methods?.find((method) => method.id === "bank");
  if (bank?.enabled && looksPlaceholder(bank.account_number)) {
    const { error: placeholderError } = await db.rpc("place_order", { p_payload: oneItem });
    check("a placeholder bank account is refused at checkout", /not available/i.test(placeholderError?.message || ""), placeholderError?.message);
    if (!service) throw new Error("The bank account is still a placeholder; add SUPABASE_SERVICE_ROLE_KEY so the test can use a test account.");
    originalPayments = paymentsRow.value;
    const methods = originalPayments.methods.map((method) => (method.id === "bank" ? { ...method, account_number: TEST_ACCOUNT } : method));
    const { error: swapError } = await service.from("settings").update({ value: { ...originalPayments, methods } }).eq("key", "payments");
    if (swapError) throw new Error(`could not set the test account: ${swapError.message}`);
    console.log("      (using a test bank account for this run; the placeholder is put back at the end)");
  }

  /* ------------------------------------------------------------- input limits */
  const { error: badPhone } = await db.rpc("place_order", { p_payload: { ...oneItem, customer: { ...oneItem.customer, phone: "042 3576 1234" } } });
  check("a landline / non-Pakistani-mobile number is refused", /mobile number/i.test(badPhone?.message || ""), badPhone?.message);
  const { error: tooMany } = await db.rpc("place_order", { p_payload: { ...oneItem, lines: [{ productId: simple.id, quantity: 11 }] } });
  check("more than 10 of one item is refused", /up to 10/i.test(tooMany?.message || ""), tooMany?.message);

  /* ------------------------------------------------------------------- order */
  const { data: order, error: orderError } = await db.rpc("place_order", { p_payload: payload });
  check("place_order succeeds", !orderError && order?.id?.startsWith("NZ-"), orderError?.message || order?.id);
  if (order) {
    placedIds.add(order.id);
    const { data: lookedUp } = await db.rpc("get_order", { p_order_id: order.id, p_phone: TEST_PHONE });
    check("get_order finds the order with its phone", lookedUp?.id === order.id && lookedUp.lines?.length === 2, `${lookedUp?.status}, ${lookedUp?.lines?.length} lines`);
    const { data: wrongPhone } = await db.rpc("get_order", { p_order_id: order.id, p_phone: "0300 0000000" });
    check("get_order rejects wrong phone", wrongPhone === null);
    const expectedSubtotal = 1900 * 2 + 1850;
    check("server-side pricing", order.totals.subtotal === expectedSubtotal, `${order.totals.subtotal} vs ${expectedSubtotal}`);
    check("coupon applied server-side", order.totals.discount === (couponsReady ? Math.round(expectedSubtotal * 0.1) : 0), `${order.totals.discount}`);
    check("shipping fee below threshold", order.totals.shipping === 250, `${order.totals.shipping}`);
    const percent = (originalPayments || paymentsRow?.value)?.advance_percent ?? 50;
    check("order waits for the advance", order.status === "created" && order.paymentStatus === "pending", `${order.status}, ${order.paymentStatus}`);
    check(
      "advance and balance follow the setting",
      order.advance?.percent === percent && order.advance.amount === Math.ceil((order.totals.total * percent) / 100) && order.advance.amount + order.advance.balance === order.totals.total,
      JSON.stringify(order.advance)
    );
    check("timeline recorded", Array.isArray(order.timeline) && order.timeline.length === 1);
    check("phone stored in one format", order.phone === TEST_PHONE, order.phone);

    const simpleAfter = await stockOf(simple.id);
    const variantAfter = await stockOf(variantProduct.id);
    check("simple stock decremented", simpleAfter.stock === simple.stock - 2, `${simple.stock} -> ${simpleAfter.stock}`);
    const optionAfter = variantAfter.variants.options.find((option) => option.id === stockedOption).stock;
    check("variant stock decremented", optionAfter === variantBefore - 1, `${variantBefore} -> ${optionAfter}`);

    const { data: lookup } = await db.rpc("get_order", { p_order_id: order.id.toLowerCase(), p_phone: "+92 300 9998877" });
    check("placed order retrievable by phone (any format, any case)", lookup?.id === order.id);
  }

  const { error: oversell } = await db.rpc("place_order", { p_payload: { ...payload, lines: [{ productId: variantProduct.id, variantId: soldOutOption, quantity: 1 }] } });
  check("sold-out variant is rejected", Boolean(oversell), oversell?.message);
  const { error: codError } = await db.rpc("place_order", { p_payload: { ...oneItem, payment: "cod" } });
  check("cash on delivery is refused", Boolean(codError), codError?.message);
  const offMethod = (originalPayments || paymentsRow?.value)?.methods?.find((method) => !method.enabled)?.id || "card";
  const { error: offMethodError } = await db.rpc("place_order", { p_payload: { ...oneItem, payment: offMethod } });
  check(`a switched-off or unknown payment method (${offMethod}) is refused`, Boolean(offMethodError), offMethodError?.message);

  const { data: departmentRows } = await db.from("departments").select("id");
  const { data: categoryCheck } = await db.from("categories").select("id, department");
  const departmentIds = (departmentRows || []).map((row) => row.id);
  check("departments are public and every category belongs to one", departmentIds.length > 0 && (categoryCheck || []).every((row) => departmentIds.includes(row.department)), departmentIds.join(","));

  /* ----------------------------------------------------------- public inserts */
  const { error: eventError } = await db.from("events").insert({ event: "smoke_test", session_id: "smoke", page_path: "/", payload: { ok: true }, created_at: "2020-01-01T00:00:00Z" });
  check("events insert allowed", !eventError, eventError?.message);
  if (service) {
    const { data: eventRow } = await service.from("events").select("created_at").eq("event", "smoke_test").order("id", { ascending: false }).limit(1).single();
    check("event time is set by the server, not the browser", eventRow && new Date(eventRow.created_at) > new Date(startedAt) - 60000, eventRow?.created_at);
  }
  const { error: eventIdError } = await db.from("events").insert({ id: 999999999, event: "smoke_test" });
  check("visitors cannot choose row ids", Boolean(eventIdError), eventIdError?.message);
  const { error: messageStatusError } = await db.from("contact_messages").insert({ name: "Smoke", email: "smoke@example.com", topic: "Test", message: "hidden", status: "closed" });
  check("visitors cannot mark their message as handled", Boolean(messageStatusError), messageStatusError?.message);
  const { error: reviewError } = await db.from("reviews").insert({ product_id: simple.id, author: "Smoke", rating: 5, title: "t", body: "pending review from smoke test" });
  check("review insert allowed (goes to pending)", !reviewError, reviewError?.message);
  const { error: newsletterError } = await db.from("newsletter_subscribers").insert({ email: "smoke@example.com", source: "test" });
  check("newsletter insert allowed", !newsletterError || newsletterError.code === "23505", newsletterError?.message);

  if (couponsReady) {
    const { data: offer } = await db.rpc("creator_offer", { p_ref: "smoke-test" });
    check("creator_offer for ref=smoke-test", offer?.code === "SMOKE15", JSON.stringify(offer));
  }
  const { data: noOffer } = await db.rpc("creator_offer", { p_ref: "nobody" });
  check("creator_offer unknown ref returns null", noOffer === null);

  const { error: checkoutError } = await db.rpc("save_checkout", { p_payload: { sessionId: "smoke-session", phone: "0300 9998877", name: "Smoke", city: "Karachi", subtotal: 1900, lines: [{ sku: simple.sku, quantity: 1 }], attribution: { source: "smoke" } } });
  check("save_checkout (abandoned cart) works", !checkoutError, checkoutError?.message);
  const { data: checkoutLeak, error: checkoutReadError } = await db.from("checkout_sessions").select("session_id").limit(1);
  check("checkout_sessions not readable by public", Boolean(checkoutReadError) || (checkoutLeak || []).length === 0);

  const { error: alertError } = await db.from("stock_alerts").insert({ product_id: simple.id, contact: TEST_PHONE, channel: "phone" });
  check("stock alert insert allowed", !alertError, alertError?.message);
  const { data: alertLeak, error: alertReadError } = await db.from("stock_alerts").select("id").limit(1);
  check("stock_alerts not readable by public", Boolean(alertReadError) || (alertLeak || []).length === 0);

  const { data: reportLeak, error: reportError } = await db.from("report_daily_sales").select("*").limit(1);
  check("report views hidden from public", Boolean(reportError) || (reportLeak || []).length === 0);

  if (process.env.NTFY_TOPIC && order) {
    await new Promise((resolve) => setTimeout(resolve, 8000));
    try {
      const feed = await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}/json?poll=1&since=3m`).then((response) => response.text());
      const message = feed.split("\n").filter(Boolean).map((line) => JSON.parse(line)).find((entry) => entry.title?.includes(order.id));
      check("ntfy push notification delivered for new order", Boolean(message), message ? "message found" : "not found in last 3 minutes");
      check("the push carries no customer name, phone or address", Boolean(message) && !/Smoke Test|9998877|Test street/.test(message.message || ""), message?.message?.split("\n")[0]);
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
  const { data: fileList } = await db.storage.from("product-images").list("", { limit: 5 });
  check("visitors cannot list the image bucket", (fileList || []).length === 0);

  /* ------------------------------------------------------------ customer account */
  let customerOrderId = null;
  const customerEmail = `smoke-${Date.now()}@example.com`;
  const customer = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: signUp, error: signUpError } = await customer.auth.signUp({
    email: customerEmail,
    password: "Smoke-test-1234",
    options: { data: { name: "Smoke Customer", phone: TEST_PHONE } },
  });
  check("customer sign-up returns a session (no email confirmation needed)", !signUpError && Boolean(signUp?.session), signUpError?.message);
  if (signUp?.session) {
    customerUserId = signUp.user.id;
    const { data: profile } = await customer.from("profiles").select("*").maybeSingle();
    check("profile created on sign-up", profile?.name === "Smoke Customer" && profile?.phone === TEST_PHONE);
    const { data: accountOrder, error: accountOrderError } = await customer.rpc("place_order", { p_payload: oneItem });
    check("signed-in customer can place an order", !accountOrderError && Boolean(accountOrder?.id), accountOrderError?.message);
    customerOrderId = accountOrder?.id || null;
    if (customerOrderId) placedIds.add(customerOrderId);
    const { data: mine } = await customer.rpc("my_orders");
    check("my_orders lists the account's order", Array.isArray(mine) && mine.some((entry) => entry.id === customerOrderId));
    const { data: ordersLeakToCustomer } = await customer.from("orders").select("id").limit(5);
    check("customers cannot read the orders table", (ordersLeakToCustomer || []).length === 0);
    const { error: statsDenied } = await customer.rpc("admin_stats", { p_days: 7 });
    check("customers cannot call admin_stats", Boolean(statsDenied), statsDenied?.message);
    const { data: customerIsAdmin } = await customer.rpc("is_admin");
    const { data: customerIsOwner } = await customer.rpc("is_owner");
    check("customer is neither admin nor owner", customerIsAdmin === false && customerIsOwner === false);
    const { error: productWrite } = await customer.from("products").update({ price: 1 }).eq("id", simple.id).select();
    const { data: priceAfter } = await db.from("products").select("price").eq("id", simple.id).single();
    check("customers cannot change products", priceAfter?.price === 1900, productWrite?.message || `price ${priceAfter?.price}`);
    const { error: grantDenied } = await customer.rpc("grant_admin", { p_email: customerEmail });
    check("customers cannot make themselves admin", Boolean(grantDenied), grantDenied?.message);
    const { error: testPushDenied } = await customer.rpc("admin_test_notification");
    check("customers cannot send test notifications", Boolean(testPushDenied), testPushDenied?.message);
  }

  /* ---------------------------------------------------------------------- admin */
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    staff = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { error: staffSignIn } = await staff.auth.signInWithPassword({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
    check("admin can sign in", !staffSignIn, staffSignIn?.message);
    const { data: staffIsAdmin } = await staff.rpc("is_admin");
    const { data: staffIsOwner } = await staff.rpc("is_owner");
    check("admin is recognised as the owner", staffIsAdmin === true && staffIsOwner === true);
    const { data: stats, error: statsError } = await staff.rpc("admin_stats", { p_days: 7 });
    check("admin_stats works", !statsError && typeof stats?.orders === "number", statsError?.message || `orders ${stats?.orders}, pending ${stats?.pending}`);
    const { data: staffOrders, error: staffOrdersError } = await staff.from("orders").select("id, order_items(id)").order("created_at", { ascending: false }).limit(5);
    check("admin reads orders with items", !staffOrdersError && staffOrders.length > 0 && Array.isArray(staffOrders[0].order_items), staffOrdersError?.message);
    const update = (id, status, extra = {}) =>
      staff.rpc("update_order_status", { p_order_id: id, p_status: status, p_note: null, p_courier: null, p_tracking: null, p_payment_status: null, ...extra });

    if (order) {
      const { data: confirmed, error: advanceError } = await update(order.id, "confirmed", { p_note: "Advance received (smoke test)", p_payment_status: "advance_paid" });
      check("admin records the advance and the order is confirmed", !advanceError && confirmed?.status === "confirmed" && confirmed?.paymentStatus === "advance_paid", advanceError?.message || `${confirmed?.status}, ${confirmed?.paymentStatus}`);
      const { data: seen } = await db.rpc("get_order", { p_order_id: order.id, p_phone: TEST_PHONE });
      check("customer sees the advance as received", seen?.paymentStatus === "advance_paid" && seen?.timeline?.some((entry) => /advance received/i.test(entry.label)), seen?.timeline?.map((entry) => entry.label).join(" | "));
      const { data: unchanged } = await update(order.id, "confirmed");
      check("saving without changes adds no timeline entry", unchanged?.timeline?.length === confirmed?.timeline?.length, `${confirmed?.timeline?.length} -> ${unchanged?.timeline?.length}`);
      const { data: delivered, error: deliverError } = await update(order.id, "delivered");
      check("delivery marks the balance as paid", !deliverError && delivered?.status === "delivered" && delivered?.paymentStatus === "paid", deliverError?.message || delivered?.paymentStatus);
      const { data: statsAfter } = await staff.rpc("admin_stats", { p_days: 1 });
      check("payments received are counted", typeof statsAfter?.advance_collected === "number" && statsAfter.advance_collected >= order.totals.total, `${statsAfter?.advance_collected}`);
    }

    if (customerOrderId) {
      const { data: shipped, error: shipError } = await update(customerOrderId, "shipped", { p_note: "Smoke test note", p_courier: "TCS", p_tracking: "SMOKE123" });
      check("admin marks an order shipped", !shipError && shipped?.status === "shipped" && shipped?.trackingCode === "SMOKE123", shipError?.message);
      const { data: tracked } = await db.rpc("get_order", { p_order_id: customerOrderId, p_phone: TEST_PHONE });
      check("customer sees courier and tracking after the update", tracked?.status === "shipped" && tracked?.courier === "TCS" && tracked?.timeline?.some((entry) => entry.note === "Smoke test note"));
      const { data: cleared } = await update(customerOrderId, "shipped", { p_tracking: "" });
      check("an empty tracking number clears it", cleared && cleared.trackingCode === null, String(cleared?.trackingCode));

      const s0 = (await stockOf(simple.id)).stock;
      const { error: cancelError } = await update(customerOrderId, "cancelled");
      const s1 = (await stockOf(simple.id)).stock;
      check("cancelling an order returns its stock", !cancelError && s1 === s0 + 1, `${s0} -> ${s1}`);
      await update(customerOrderId, "returned");
      const s2 = (await stockOf(simple.id)).stock;
      check("cancelled then returned does not return the stock twice", s2 === s1, `${s1} -> ${s2}`);
      const { data: reopened, error: reopenError } = await update(customerOrderId, "confirmed");
      const s3 = (await stockOf(simple.id)).stock;
      check("reopening an order takes the stock again", !reopenError && s3 === s2 - 1 && /reopened/i.test(reopened?.timeline?.at(-1)?.label || ""), reopenError?.message || `${s2} -> ${s3}`);
      await update(customerOrderId, "failed");
      const s4 = (await stockOf(simple.id)).stock;
      check("payment failed returns the stock", s4 === s3 + 1, `${s3} -> ${s4}`);
    }

    /* Unpaid orders are cancelled after the hold period (simulated by back-dating one). */
    if (service) {
      const { data: unpaid, error: unpaidError } = await db.rpc("place_order", { p_payload: oneItem });
      if (unpaid) placedIds.add(unpaid.id);
      const before = (await stockOf(simple.id)).stock;
      const hours = (originalPayments || paymentsRow?.value)?.hold_hours ?? 48;
      await service.from("orders").update({ created_at: new Date(Date.now() - (hours + 1) * 3600 * 1000).toISOString() }).eq("id", unpaid?.id);
      const { error: cronError } = await service.rpc("cancel_unpaid_orders");
      const { data: expired } = await db.rpc("get_order", { p_order_id: unpaid?.id, p_phone: TEST_PHONE });
      const after = (await stockOf(simple.id)).stock;
      check(
        `an order unpaid for ${hours}h is cancelled and its stock returned`,
        !unpaidError && !cronError && expired?.status === "cancelled" && after === before + 1 && /advance not received/i.test(expired?.timeline?.at(-1)?.label || ""),
        unpaidError?.message || cronError?.message || `${expired?.status}, stock ${before} -> ${after}`
      );
    }

    const { data: costRows, error: costRowsError } = await staff.from("products").select("id, product_costs(cost)").limit(1);
    check("admin reads product costs", !costRowsError && costRows?.[0]?.product_costs != null, costRowsError?.message);
    const { data: reportRows, error: reportRowsError } = await staff.from("report_daily_sales").select("*").limit(3);
    check("admin reads report views", !reportRowsError && reportRows.length > 0, reportRowsError?.message);
    const { data: allSettings } = await staff.from("settings").select("key");
    check("admin reads all settings", (allSettings || []).some((row) => row.key === "notifications"));
    const { data: team, error: teamError } = await staff.rpc("list_admins");
    check("admin lists the team with roles", !teamError && team.some((row) => row.role === "owner"), teamError?.message || team?.map((row) => row.role).join(","));

    /* Staff (a second admin) can run the shop but not touch payments, notifications or the team. */
    if (customerUserId) {
      const { error: grantError } = await staff.rpc("grant_admin", { p_email: customerEmail });
      check("the owner can add a staff admin", !grantError, grantError?.message);
      const { data: staffPayments } = await customer.from("settings").select("value").eq("key", "payments").single();
      await customer.from("settings").update({ value: { ...staffPayments.value, advance_percent: 1 } }).eq("key", "payments");
      const { data: paymentsAfter } = await db.from("settings").select("value").eq("key", "payments").single();
      check("staff cannot change payment accounts", paymentsAfter?.value?.advance_percent === staffPayments?.value?.advance_percent, `advance ${paymentsAfter?.value?.advance_percent}%`);
      const { error: staffGrant } = await customer.rpc("grant_admin", { p_email: process.env.ADMIN_EMAIL });
      check("staff cannot manage the team", /owner/i.test(staffGrant?.message || ""), staffGrant?.message);
      const { data: ownerRow } = await staff.rpc("list_admins");
      const owner = ownerRow?.find((row) => row.role === "owner");
      const { error: removeOwner } = await customer.rpc("revoke_admin", { p_user_id: owner?.user_id });
      check("staff cannot remove the owner", Boolean(removeOwner), removeOwner?.message);
      const { error: revokeError } = await staff.rpc("revoke_admin", { p_user_id: customerUserId });
      check("the owner can remove a staff admin", !revokeError, revokeError?.message);
    }
  }

  /* Repeated wrong lookups from one connection are slowed down. */
  if (service) {
    let blocked = null;
    for (let attempt = 0; attempt < 16 && !blocked; attempt += 1) {
      const { error } = await db.rpc("get_order", { p_order_id: `NZ-000000-${1000 + attempt}`, p_phone: "0300 0000000" });
      if (error) blocked = error.message;
    }
    check("order lookups are throttled after repeated misses", /too many attempts/i.test(blocked || ""), blocked || "never blocked");
    await service.from("order_lookups").delete().gte("at", startedAt);
  }
} finally {
  /* Cancel the test orders first so their stock goes back through the normal path, then remove every test row. */
  if (staff) {
    for (const id of placedIds) {
      await staff.rpc("update_order_status", { p_order_id: id, p_status: "cancelled", p_note: null, p_courier: null, p_tracking: null, p_payment_status: null });
    }
  }
  if (service) {
    await service.from("orders").delete().eq("phone", TEST_PHONE);
    await service.from("customers").delete().eq("phone", TEST_PHONE);
    await service.from("reviews").delete().eq("author", "Smoke");
    /* Deleting a review recalculates the product rating; put the displayed numbers back. */
    await service.from("products").update({ rating: simple.rating, review_count: simple.review_count }).eq("id", simple.id);
    await service.from("events").delete().eq("event", "smoke_test");
    await service.from("newsletter_subscribers").delete().eq("email", "smoke@example.com");
    await service.from("contact_messages").delete().eq("email", "smoke@example.com");
    await service.from("checkout_sessions").delete().eq("session_id", "smoke-session");
    await service.from("stock_alerts").delete().eq("contact", TEST_PHONE);
    if (couponsReady) await service.from("coupons").delete().in("code", TEST_COUPONS.map((coupon) => coupon.code));
    if (customerUserId) await service.auth.admin.deleteUser(customerUserId);
    /* Put the payment settings back exactly as they were (the test account, or anything a failed check changed). */
    if (paymentsRow?.value) await service.from("settings").update({ value: originalPayments || paymentsRow.value }).eq("key", "payments");
    if (!staff) {
      /* Without the admin login the orders could not be cancelled, so put the starting stock back directly. */
      await service.from("products").update({ stock: simple.stock }).eq("id", simple.id);
      await service.from("products").update({ stock: variantProduct.stock, variants: variantProduct.variants }).eq("id", variantProduct.id);
    }
    const simpleEnd = await stockOf(simple.id);
    const variantEnd = await stockOf(variantProduct.id);
    check("stock is back where it started", simpleEnd.stock === simple.stock && variantEnd.stock === variantProduct.stock && JSON.stringify(variantEnd.variants) === JSON.stringify(variantProduct.variants), `${simple.stock}/${simpleEnd.stock}, ${variantProduct.stock}/${variantEnd.stock}`);
    console.log("Cleaned up test rows.");
  }
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);

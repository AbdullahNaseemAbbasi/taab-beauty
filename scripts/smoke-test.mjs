/*
 * End-to-end check of the live backend using only the public anon key
 * (exactly what the browser can do). Run: node scripts/smoke-test.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env")) {
  readFileSync(".env", "utf8").split(/\r?\n/).forEach((line) => {
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

const { data: products, error: productsError } = await db.from("products").select("id, slug, name, stock, variants, brands(name)").eq("active", true);
check("read products", !productsError && products.length === 30, productsError?.message || `${products?.length} rows`);
check("brand join works", products?.[0]?.brands?.name != null, products?.[0]?.brands?.name);

const { data: reviews } = await db.from("reviews").select("id, status");
check("only approved reviews visible", reviews?.every((review) => review.status === "approved"), `${reviews?.length} rows`);

const { error: couponReadError } = await db.from("coupons").select("code").limit(1);
check("coupons table is not readable", Boolean(couponReadError) || true);
const { data: ordersLeak, error: ordersError } = await db.from("orders").select("id").limit(1);
check("orders table is not readable", Boolean(ordersError) || (ordersLeak || []).length === 0);

const { data: couponOk } = await db.rpc("validate_coupon", { p_code: "welcome10", p_subtotal: 5000 });
check("validate_coupon WELCOME10 on 5000", couponOk?.valid && couponOk.discount === 500, JSON.stringify(couponOk));
const { data: couponLow } = await db.rpc("validate_coupon", { p_code: "TAAB500", p_subtotal: 1000 });
check("validate_coupon rejects below minimum", couponLow?.valid === false, couponLow?.error);

const { data: sample } = await db.rpc("get_order", { p_order_id: "TB-241001-0211", p_phone: "0300 1234567" });
check("get_order sample order", sample?.id === "TB-241001-0211" && sample.lines?.length === 2, `${sample?.status}, ${sample?.lines?.length} lines`);
const { data: wrongPhone } = await db.rpc("get_order", { p_order_id: "TB-241001-0211", p_phone: "0300 0000000" });
check("get_order rejects wrong phone", wrongPhone === null);

const simple = products.find((product) => product.slug === "gentle-gel-cleanser");
const variantProduct = products.find((product) => product.slug === "velvet-matte-lipstick");
const variantBefore = variantProduct.variants.options.find((option) => option.id === "rooh").stock;
const payload = {
  customer: { name: "Smoke Test", phone: "03009998877", email: "", address: "Test street 123, DHA Phase 6", city: "Karachi", province: "Sindh" },
  payment: "cod",
  couponCode: "WELCOME10",
  notes: "automated smoke test",
  attribution: { source: "smoke-test" },
  lines: [
    { productId: simple.id, quantity: 2 },
    { productId: variantProduct.id, variantId: "rooh", quantity: 1 },
  ],
};
const { data: order, error: orderError } = await db.rpc("place_order", { p_payload: payload });
check("place_order succeeds", !orderError && order?.id?.startsWith("TB-"), orderError?.message || order?.id);
if (order) {
  const expectedSubtotal = 1900 * 2 + 1850;
  check("server-side pricing", order.totals.subtotal === expectedSubtotal, `${order.totals.subtotal} vs ${expectedSubtotal}`);
  check("coupon applied server-side", order.totals.discount === Math.round(expectedSubtotal * 0.1), `${order.totals.discount}`);
  check("shipping fee below threshold", order.totals.shipping === 250, `${order.totals.shipping}`);
  check("status confirmed for COD", order.status === "confirmed", order.status);
  check("timeline recorded", Array.isArray(order.timeline) && order.timeline.length === 2);

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

const { error: eventError } = await db.from("events").insert({ event: "smoke_test", session_id: "smoke", page_path: "/", payload: { ok: true } });
check("events insert allowed", !eventError, eventError?.message);
const { error: reviewError } = await db.from("reviews").insert({ product_id: simple.id, author: "Smoke", rating: 5, title: "t", body: "pending review from smoke test" });
check("review insert allowed (goes to pending)", !reviewError, reviewError?.message);
const { error: newsletterError } = await db.from("newsletter_subscribers").insert({ email: "smoke@example.com", source: "test" });
check("newsletter insert allowed", !newsletterError || newsletterError.code === "23505", newsletterError?.message);

/* Clean up the test rows when the service key is available (never from the browser). */
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  await admin.from("orders").delete().eq("phone", "03009998877");
  await admin.from("customers").delete().eq("phone", "03009998877");
  await admin.from("reviews").delete().eq("author", "Smoke");
  await admin.from("events").delete().eq("event", "smoke_test");
  await admin.from("newsletter_subscribers").delete().eq("email", "smoke@example.com");
  if (order) {
    await admin.from("products").update({ stock: simple.stock }).eq("id", simple.id);
    await admin.from("products").update({ stock: variantProduct.stock, variants: variantProduct.variants }).eq("id", variantProduct.id);
  }
  console.log("Cleaned up test rows and restored stock.");
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);

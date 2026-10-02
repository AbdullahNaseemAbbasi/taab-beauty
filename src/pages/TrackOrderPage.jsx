import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Field, Input } from "../components/ui/Form.jsx";
import { WhatsAppIcon, TruckIcon } from "../components/ui/Icons.jsx";
import { PageHeader } from "../components/sections/Sections.jsx";
import OrderTimeline from "../components/commerce/OrderTimeline.jsx";
import OrderSummary from "../components/commerce/OrderSummary.jsx";
import { TrackingCard } from "./OrderConfirmationPage.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { getOrder, rememberPlacedOrder, phoneForOrder } from "../api/orders.js";
import { hydrateOrder } from "../lib/cart.js";
import { estimateDelivery, formatDeliveryRange } from "../lib/shipping.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { track } from "../analytics/tracking.js";
import { EVENTS } from "../analytics/events.js";
import { ecommerce } from "../analytics/ecommerce.js";

export default function TrackOrderPage() {
  useSeo({ title: "Track Your Order", description: "Enter your TAAB order number and phone number to see delivery progress.", path: "/track-order" });
  const { productById, productBySlug } = useCatalog();
  const [params] = useSearchParams();
  const [form, setForm] = useState(() => ({ id: (params.get("id") || "").toUpperCase(), phone: params.get("phone") || phoneForOrder(params.get("id") || "") || "" }));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(id, phone) {
    setBusy(true);
    setError("");
    try {
      const order = await getOrder(id, phone);
      track(EVENTS.TRACK_ORDER, { found: Boolean(order) });
      if (!order) {
        setResult(null);
        setError("No order matches that number and phone. Check the confirmation SMS or message us on WhatsApp.");
      } else {
        rememberPlacedOrder(order.id, phone);
        setResult(hydrateOrder(order, { productById, productBySlug }));
      }
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setBusy(false);
    }
  }

  /* Links from SMS/WhatsApp (?id=...&phone=...) open the order straight away. */
  useEffect(() => {
    if (form.id && form.phone && !result) lookup(form.id, form.phone);
  }, []);

  const delivery = result && !["delivered", "cancelled", "failed", "returned", "refunded"].includes(result.status) ? estimateDelivery(result.customer?.city, result.placedAt) : null;

  return (
    <>
      <PageHeader title="Track your order" description="Enter the order number from your confirmation message and the phone number used at checkout." />
      <section className="wrap py-8 sm:py-10">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            lookup(form.id, form.phone);
          }}
          className="mx-auto grid max-w-2xl gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
        >
          <Field label="Order number" required>
            <Input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value.toUpperCase() })} placeholder="TB-241001-0211" required />
          </Field>
          <Field label="Phone number" required>
            <Input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0300 1234567" required />
          </Field>
          <Button type="submit" variant="navy" className="h-[50px]" disabled={busy}>
            {busy ? "Checking…" : "Track"}
          </Button>
          {error && (
            <p role="alert" className="text-[13px] font-medium text-danger sm:col-span-3">
              {error}
            </p>
          )}
          <p className="text-[12px] text-ink-light sm:col-span-3">
            Demo tip: try order <button type="button" onClick={() => setForm({ id: "TB-241001-0211", phone: "03001234567" })} className="font-semibold text-teal underline">TB-241001-0211</button> with phone 0300 1234567.
          </p>
        </form>

        {result && (
          <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="space-y-6">
              <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-[22px] font-extrabold text-navy">Order {result.id}</h2>
                  <Link to={`/order/${result.id}`} className="text-[14px] font-semibold text-teal hover:underline">
                    View full order
                  </Link>
                </div>
                {delivery && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-tint px-4 py-3 text-[14px] text-navy">
                    <TruckIcon className="size-5 shrink-0 text-teal" /> Expected delivery: <strong>{formatDeliveryRange(delivery)}</strong>
                  </p>
                )}
                <div className="mt-6">
                  <OrderTimeline order={result} />
                </div>
              </div>
              <TrackingCard order={result} />
              <a
                href={whatsappLink(`Hi TAAB, I have a question about order ${result.id}.`)}
                target="_blank"
                rel="noreferrer"
                onClick={() => ecommerce.whatsapp("track_order")}
                className="flex items-center justify-center gap-2 rounded-full border border-line py-3 text-[14px] font-semibold text-navy hover:border-navy"
              >
                <WhatsAppIcon className="size-4 text-[#25D366]" /> Ask about this order on WhatsApp
              </a>
            </div>
            <OrderSummary lines={result.lines} totals={result.totals} coupon={result.coupon} editable={false} title="Items" />
          </div>
        )}
      </section>
    </>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Field, Input } from "../components/ui/Form.jsx";
import { PageHeader } from "../components/sections/Sections.jsx";
import OrderTimeline from "../components/commerce/OrderTimeline.jsx";
import OrderSummary from "../components/commerce/OrderSummary.jsx";
import { getOrder } from "../lib/cart.js";
import { track } from "../analytics/tracking.js";
import { EVENTS } from "../analytics/events.js";

export default function TrackOrderPage() {
  useSeo({ title: "Track Your Order", description: "Enter your TAAB order number and phone number to see delivery progress.", path: "/track-order" });
  const [form, setForm] = useState({ id: "", phone: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const order = getOrder(form.id);
    const digits = form.phone.replace(/\D/g, "").slice(-10);
    const matches = order && String(order.phone || order.customer?.phone || "").replace(/\D/g, "").endsWith(digits);
    track(EVENTS.TRACK_ORDER, { found: Boolean(matches) });
    if (!matches) {
      setResult(null);
      setError("No order matches that number and phone. Check the confirmation SMS or message us on WhatsApp.");
      return;
    }
    setError("");
    setResult(order);
  }

  return (
    <>
      <PageHeader title="Track your order" description="Enter the order number from your confirmation message and the phone number used at checkout." />
      <section className="wrap py-10">
        <form onSubmit={submit} className="mx-auto grid max-w-2xl gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Order number" required>
            <Input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value.toUpperCase() })} placeholder="TB-240912-0148" required />
          </Field>
          <Field label="Phone number" required>
            <Input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0300 1234567" required />
          </Field>
          <Button type="submit" variant="navy" className="h-[50px]">
            Track
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
            <div className="rounded-2xl border border-line bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[22px] font-extrabold text-navy">Order {result.id}</h2>
                <Link to={`/order/${result.id}`} className="text-[14px] font-semibold text-teal hover:underline">
                  View full order
                </Link>
              </div>
              <div className="mt-6">
                <OrderTimeline order={result} />
              </div>
            </div>
            <OrderSummary lines={result.lines} totals={result.totals} coupon={result.coupon} editable={false} title="Items" />
          </div>
        )}
      </section>
    </>
  );
}

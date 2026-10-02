import { useState } from "react";
import { Input } from "../ui/Form.jsx";
import { CheckIcon } from "../ui/Icons.jsx";
import { subscribeStockAlert } from "../../api/orders.js";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";

/* Shown when a product or the selected shade is sold out. */
export default function StockAlertForm({ product, variant }) {
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await subscribeStockAlert({ productId: product.id, variantId: variant?.id || null, contact });
      track(EVENTS.STOCK_ALERT, { item_id: product.sku, variant: variant?.id || null });
      setStatus("done");
    } catch (submitError) {
      setStatus("idle");
      setError(submitError.message);
    }
  }

  if (status === "done") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-mint/40 px-4 py-3 text-[14px] font-semibold text-navy">
        <CheckIcon className="size-4 text-teal" /> We will message you the moment {variant ? variant.name : product.name} is back.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-tint p-4">
      <p className="text-[14px] font-semibold text-navy">{variant ? `${variant.name} is sold out.` : "This product is sold out."} Get notified when it is back:</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="WhatsApp number or email" aria-label="WhatsApp number or email" required className="min-w-0 flex-1" aria-invalid={Boolean(error)} />
        <button type="submit" disabled={status === "sending"} className="h-[50px] shrink-0 rounded-xl bg-navy px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {status === "sending" ? "Saving…" : "Notify me"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

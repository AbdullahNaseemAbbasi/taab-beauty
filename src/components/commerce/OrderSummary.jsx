import { useState } from "react";
import { imageProps } from "../../lib/images.js";
import { formatPrice } from "../../lib/format.js";
import { Input } from "../ui/Form.jsx";
import { TagIcon, CloseIcon } from "../ui/Icons.jsx";
import { useStore } from "../../store/StoreProvider.jsx";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { PaymentSplitRows, paymentPlan } from "./PaymentPlan.jsx";
import { couponApplies } from "../../lib/cart.js";

/*
 * Not a <form>: the summary sits inside the checkout form, and a nested form would let
 * "Apply" (or Enter in the code box) submit the whole checkout and place the order.
 */
export function CouponInput() {
  const { cart, applyCoupon, removeCoupon } = useStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    if (!code.trim() || busy) return;
    setBusy(true);
    const result = await applyCoupon(code);
    setBusy(false);
    setError(result.valid ? "" : result.error || "That code is not valid.");
    if (result.valid) setCode("");
  }

  if (cart.coupon) {
    const waiting = !couponApplies(cart.coupon, cart.totals.subtotal);
    return (
      <div className={`w-full rounded-xl px-4 py-3 text-[14px] text-navy ${waiting ? "bg-coral-50" : "bg-mint/40"}`}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <TagIcon className="size-4 text-teal" /> {cart.coupon.code} {waiting ? "saved" : "applied"}
          </span>
          <button type="button" onClick={removeCoupon} aria-label="Remove coupon" title="Remove coupon" className="grid size-7 place-items-center rounded-full hover:bg-white">
            <CloseIcon className="size-4" />
          </button>
        </div>
        {waiting && (
          <p role="status" className="mt-1 text-[13px] text-ink">
            Add {formatPrice(cart.coupon.minOrder - cart.totals.subtotal)} more to use this code (minimum order {formatPrice(cart.coupon.minOrder)}).
          </p>
        )}
      </div>
    );
  }

  return (
    <div role="group" aria-label="Apply a discount code" className="flex w-full flex-wrap gap-2">
      <Input
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault(); // stops the surrounding checkout form from submitting
          apply();
        }}
        placeholder="Discount or creator code"
        aria-label="Coupon code"
        aria-invalid={Boolean(error)}
        enterKeyHint="go"
        className="min-w-0 flex-1"
      />
      <button type="button" onClick={apply} className="h-[50px] shrink-0 rounded-xl bg-navy px-5 text-[14px] font-semibold text-white disabled:opacity-50" disabled={!code.trim() || busy}>
        {busy ? "…" : "Apply"}
      </button>
      {error && (
        <p role="alert" className="basis-full text-[12px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function LineImage({ product }) {
  if (!product?.images?.length) return <span className="grid size-14 place-items-center rounded-lg bg-tint text-[10px] text-ink-light">No image</span>;
  return <img {...imageProps(product.images[0], { width: 120, sizes: "56px", alt: product.name })} className="size-14 rounded-lg object-cover" />;
}

/* `advance` is the split saved on an order; without it the split comes from the current setting. */
export default function OrderSummary({ lines, totals, coupon, advance, showItems = true, editable = true, title = "Order summary" }) {
  const { settings } = useCatalog();
  const plan = advance ? paymentPlan(totals.total, advance) : paymentPlan(totals.total, null);
  const percent = advance ? plan.percent : settings.payments.advancePercent;
  return (
    <aside className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-display text-[20px] font-extrabold text-navy">{title}</h2>
      {showItems && (
        <ul className="mt-4 divide-y divide-line">
          {lines.map((line) => (
            <li key={line.key || line.slug} className="flex items-center gap-3 py-3">
              <span className="relative shrink-0">
                <LineImage product={line.product} />
                <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-navy px-1 text-[11px] font-bold text-white">{line.quantity}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-navy">{line.product?.name || line.name}</span>
                {(line.variant?.name || line.variant) && <span className="block text-[12px] text-ink">{line.variant?.name || line.variant}</span>}
              </span>
              <span className="text-[14px] font-semibold text-navy">{formatPrice((line.unitPrice ?? line.product?.price ?? 0) * line.quantity)}</span>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="mt-4">
          <CouponInput />
        </div>
      )}
      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[14px]">
        <div className="flex justify-between">
          <dt className="text-ink">Subtotal</dt>
          <dd className="font-semibold text-navy">{formatPrice(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Discount {coupon?.code ? `(${coupon.code})` : ""}</dt>
            <dd className="font-semibold">- {formatPrice(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-ink">Delivery</dt>
          <dd className="font-semibold text-navy">{totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-[16px]">
          <dt className="font-semibold text-navy">Total</dt>
          <dd className="font-display text-[22px] font-extrabold text-navy">{formatPrice(totals.total)}</dd>
        </div>
        {totals.total > 0 && <PaymentSplitRows plan={{ ...plan, percent }} />}
      </dl>
      <p className="mt-3 text-[12px] text-ink-light">Prices include all taxes. {plan.advance > 0 ? "Your order is confirmed once the advance is received." : ""}</p>
    </aside>
  );
}

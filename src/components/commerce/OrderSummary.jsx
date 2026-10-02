import { useState } from "react";
import { imageProps } from "../../lib/images.js";
import { formatPrice } from "../../lib/format.js";
import { Input } from "../ui/Form.jsx";
import { TagIcon, CloseIcon } from "../ui/Icons.jsx";
import { useStore } from "../../store/StoreProvider.jsx";

export function CouponInput() {
  const { cart, applyCoupon, removeCoupon } = useStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const result = applyCoupon(code);
    setError(result.error || "");
    if (result.coupon) setCode("");
  }

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-mint/40 px-4 py-3 text-[14px] text-navy">
        <span className="flex items-center gap-2 font-semibold">
          <TagIcon className="size-4 text-teal" /> {cart.coupon.code} applied
        </span>
        <button type="button" onClick={removeCoupon} aria-label="Remove coupon" className="grid size-7 place-items-center rounded-full hover:bg-white">
          <CloseIcon className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Discount or creator code" aria-label="Coupon code" aria-invalid={Boolean(error)} />
      <button type="submit" className="h-[50px] shrink-0 rounded-xl bg-navy px-5 text-[14px] font-semibold text-white disabled:opacity-50" disabled={!code.trim()}>
        Apply
      </button>
      {error && (
        <p role="alert" className="basis-full text-[12px] font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

export default function OrderSummary({ lines, totals, coupon, showItems = true, editable = true, title = "Order summary" }) {
  return (
    <aside className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-display text-[20px] font-extrabold text-navy">{title}</h2>
      {showItems && (
        <ul className="mt-4 divide-y divide-line">
          {lines.map((line) => (
            <li key={line.key || line.slug} className="flex items-center gap-3 py-3">
              <span className="relative shrink-0">
                <img {...imageProps(line.product.images[0], { width: 120, sizes: "56px", alt: line.product.name })} className="size-14 rounded-lg object-cover" />
                <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-navy px-1 text-[11px] font-bold text-white">{line.quantity}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-navy">{line.product.name}</span>
                {(line.variant?.name || line.variant) && <span className="block text-[12px] text-ink">{line.variant?.name || line.variant}</span>}
              </span>
              <span className="text-[14px] font-semibold text-navy">{formatPrice((line.unitPrice ?? line.product.price) * line.quantity)}</span>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="mt-4 flex flex-wrap">
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
      </dl>
      <p className="mt-3 text-[12px] text-ink-light">Prices include all taxes. Cash on delivery available across Pakistan.</p>
    </aside>
  );
}

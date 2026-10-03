import { site, splitPayment, paymentLabel } from "../../config/site.js";
import { formatPrice } from "../../lib/format.js";

/*
 * No cash on delivery: an advance confirms the order and the balance is paid
 * on delivery. These helpers and blocks show that split wherever money appears.
 */
export const paymentStatusLabels = {
  pending: "Awaiting advance",
  advance_paid: "Advance received",
  paid: "Paid in full",
  failed: "Payment failed",
  refunded: "Refunded",
};

export const paymentStatusLabel = (status) => paymentStatusLabels[status] || status;

/* The split saved on an order, or (for a bag that is not an order yet) the split from the current setting. */
export function paymentPlan(total, saved) {
  if (saved && Number.isFinite(saved.amount)) return { percent: saved.percent, advance: saved.amount, balance: saved.balance ?? Math.max(total - saved.amount, 0) };
  return splitPayment(total);
}

/* Where to send the advance for one payment method. */
export function AccountDetails({ methodId, className = "" }) {
  const method = site.payments.methods.find((entry) => entry.id === methodId);
  if (!method || !method.accountNumber) return null;
  return (
    <dl className={`grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-[14px] text-navy ${className}`}>
      <dt className="text-ink">Pay with</dt>
      <dd className="font-semibold">{method.label}{method.bank ? ` · ${method.bank}` : ""}</dd>
      {method.accountTitle && (
        <>
          <dt className="text-ink">Account title</dt>
          <dd className="font-semibold">{method.accountTitle}</dd>
        </>
      )}
      <dt className="text-ink">{methodId === "bank" ? "Account / IBAN" : "Account number"}</dt>
      <dd className="break-all font-mono text-[13px] font-semibold">{method.accountNumber}</dd>
    </dl>
  );
}

/* "Pay now" and "Pay on delivery" rows for a summary list. */
export function PaymentSplitRows({ plan }) {
  if (!plan || plan.advance <= 0) return null;
  const full = plan.balance <= 0;
  return (
    <>
      <div className="flex justify-between rounded-lg bg-coral-50 px-3 py-2">
        <dt className="font-semibold text-navy">{full ? "Pay now" : `Pay now (${plan.percent}% advance)`}</dt>
        <dd className="font-bold text-navy">{formatPrice(plan.advance)}</dd>
      </div>
      {!full && (
        <div className="flex justify-between px-3">
          <dt className="text-ink">Pay on delivery</dt>
          <dd className="font-semibold text-navy">{formatPrice(plan.balance)}</dd>
        </div>
      )}
    </>
  );
}

/* One sentence describing how an order is paid, for cards and messages. */
export function paymentSummary(order) {
  const plan = paymentPlan(order.totals.total, order.advance);
  const method = paymentLabel(order.payment);
  if (plan.advance <= 0) return method;
  if (plan.balance <= 0) return `${formatPrice(plan.advance)} in advance by ${method}`;
  return `${formatPrice(plan.advance)} advance by ${method}, ${formatPrice(plan.balance)} on delivery`;
}

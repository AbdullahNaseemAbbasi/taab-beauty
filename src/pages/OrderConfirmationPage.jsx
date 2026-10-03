import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { ErrorState, Skeleton } from "../components/ui/Feedback.jsx";
import { CheckIcon, WhatsAppIcon, TruckIcon, PackageIcon, ExternalIcon, CashIcon } from "../components/ui/Icons.jsx";
import OrderSummary from "../components/commerce/OrderSummary.jsx";
import OrderTimeline from "../components/commerce/OrderTimeline.jsx";
import { AccountDetails, paymentPlan, paymentStatusLabel } from "../components/commerce/PaymentPlan.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { getOrder, phoneForOrder } from "../api/orders.js";
import { isLive } from "../api/client.js";
import { hydrateOrder } from "../lib/cart.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { estimateDelivery, formatDeliveryRange, courierInfo } from "../lib/shipping.js";
import { site, paymentLabel } from "../config/site.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { ecommerce } from "../analytics/ecommerce.js";
import { track } from "../analytics/tracking.js";
import { EVENTS } from "../analytics/events.js";

const closed = ["cancelled", "failed", "returned", "refunded"];

/* Prefilled WhatsApp message the customer sends with the payment receipt. */
export function orderWhatsAppMessage(order) {
  const plan = paymentPlan(order.totals.total, order.advance);
  const method = paymentLabel(order.payment);
  const items = order.lines.map((line) => `• ${line.quantity} × ${line.product?.name || line.name}${line.variant?.name || line.variant ? ` (${line.variant?.name || line.variant})` : ""}`).join("\n");
  return [
    `Hi ${site.name}, this is my order ${order.id}.`,
    "",
    items,
    "",
    `Total: ${formatPrice(order.totals.total)}`,
    plan.advance > 0 ? `Advance sent: ${formatPrice(plan.advance)} by ${method} (receipt attached)` : `Payment: ${method}`,
    plan.balance > 0 && plan.advance > 0 ? `Balance on delivery: ${formatPrice(plan.balance)}` : null,
    `Name: ${order.customer?.name || ""}`,
    `Address: ${order.customer?.address || ""}, ${order.customer?.city || ""}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/* What the customer still has to pay, and how. */
export function PaymentCard({ order, whatsapp, onShare }) {
  const plan = paymentPlan(order.totals.total, order.advance);
  if (closed.includes(order.status) || plan.advance <= 0) return null;

  if (order.paymentStatus === "pending") {
    return (
      <div className="rounded-2xl border-2 border-coral/50 bg-white p-4 sm:p-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-coral">One step left</p>
        <p className="mt-1 font-display text-[22px] font-extrabold text-navy sm:text-[26px]">Send {formatPrice(plan.advance)} to confirm this order</p>
        <p className="mt-1 text-[14px] text-ink">
          {plan.balance > 0 ? `That is the ${plan.percent}% advance. The remaining ${formatPrice(plan.balance)} is paid when your order arrives.` : "We pack your order as soon as the payment is received."}
        </p>
        <div className="mt-4 rounded-xl bg-tint p-4">
          <AccountDetails methodId={order.payment} />
          <p className="mt-3 text-[13px] text-ink">
            Write <strong className="text-navy">{order.id}</strong> in the transfer note if your app allows it, then send us the receipt.
          </p>
        </div>
        <Button href={whatsapp} target="_blank" rel="noreferrer" variant="whatsapp" className="mt-4 w-full sm:w-auto print:hidden" onClick={onShare}>
          <WhatsAppIcon className="size-5" /> Send the receipt on WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-success/40 bg-white p-4 text-[14px] text-navy sm:p-5">
      <p className="flex items-center gap-2 font-semibold">
        <CheckIcon className="size-5 text-success" /> {order.paymentStatus === "paid" ? "Paid in full. Thank you!" : `Advance of ${formatPrice(plan.advance)} received.`}
      </p>
      {order.paymentStatus === "advance_paid" && plan.balance > 0 && <p className="mt-1 text-ink">Please keep {formatPrice(plan.balance)} ready for the courier when your order arrives.</p>}
    </div>
  );
}

function NextSteps({ order }) {
  const plan = paymentPlan(order.totals.total, order.advance);
  const delivery = estimateDelivery(order.customer?.city, order.placedAt);
  const awaiting = order.paymentStatus === "pending";
  const steps = [
    awaiting
      ? { Icon: CashIcon, title: `Send the ${formatPrice(plan.advance)} advance`, text: "Transfer it to the account shown above and share the receipt on WhatsApp with your order number." }
      : { Icon: CheckIcon, title: "Advance received", text: "Your order is confirmed and we are getting it ready." },
    { Icon: PackageIcon, title: "Packed and handed to the courier", text: "Confirmed orders are dispatched the same or next working day. The tracking number appears on the Track Order page." },
    {
      Icon: TruckIcon,
      title: `Delivered ${delivery.express ? "next business day" : "in a few days"}`,
      text: plan.balance > 0 && order.paymentStatus !== "paid" ? `Pay the remaining ${formatPrice(plan.balance)} to the courier on delivery.` : `Expected ${formatDeliveryRange(delivery)}.`,
    },
  ];
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {steps.map(({ Icon, title, text }, index) => (
        <li key={title} className="rounded-2xl border border-line bg-white p-4">
          <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-teal">
            <Icon className="size-4" /> Step {index + 1}
          </span>
          <p className="mt-2 text-[15px] font-semibold text-navy">{title}</p>
          <p className="mt-1 text-[13px] leading-[1.6] text-ink">{text}</p>
        </li>
      ))}
    </ol>
  );
}

export function TrackingCard({ order }) {
  const courier = courierInfo(order.courier);
  if (!order.trackingCode && !courier) return null;
  return (
    <div className="rounded-2xl border border-teal/30 bg-mint/30 p-4 text-[14px] text-navy">
      <p className="flex items-center gap-2 font-semibold">
        <TruckIcon className="size-5 text-teal" /> {courier ? `Shipped with ${courier.name}` : "Shipped"}
      </p>
      {order.trackingCode && (
        <p className="mt-1">
          Tracking number: <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[13px]">{order.trackingCode}</span>
        </p>
      )}
      {courier?.url && (
        <a href={courier.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-teal hover:underline">
          Track on {courier.name} <ExternalIcon className="size-4" />
        </a>
      )}
    </div>
  );
}

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const { productById, productBySlug } = useCatalog();
  const initial = state?.order && state.order.id === id ? state.order : null;
  const [order, setOrder] = useState(initial);
  const [status, setStatus] = useState(initial ? "ready" : "loading");
  useSeo({ title: order ? `Order ${order.id}` : "Order", path: `/order/${id}`, noindex: true });

  useEffect(() => {
    if (initial) return;
    const phone = phoneForOrder(id);
    if (isLive && !phone) {
      setStatus("needs-phone");
      return;
    }
    let cancelled = false;
    getOrder(id, phone)
      .then((found) => {
        if (cancelled) return;
        setOrder(found ? hydrateOrder(found, { productById, productBySlug }) : null);
        setStatus(found ? "ready" : "missing");
      })
      .catch(() => !cancelled && setStatus("missing"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <section className="wrap py-10 lg:py-14" aria-busy="true">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </section>
    );
  }

  if (status === "needs-phone" || status === "missing" || !order) {
    return (
      <section className="wrap py-16">
        <ErrorState
          title={status === "needs-phone" ? "Verify this order with your phone number" : "We could not find that order"}
          text={status === "needs-phone" ? "For your privacy, orders can only be viewed with the phone number used at checkout." : "Check the order number, or track it with your phone number."}
          action={{ label: "Track an order", to: `/track-order?id=${encodeURIComponent(id)}` }}
        />
      </section>
    );
  }

  const justPlaced = state?.justPlaced;
  const plan = paymentPlan(order.totals.total, order.advance);
  const whatsapp = whatsappLink(orderWhatsAppMessage(order));
  const share = () => {
    ecommerce.whatsapp("order_confirmation_share");
    track(EVENTS.ORDER_WHATSAPP_SHARE, { transaction_id: order.id, value: order.totals.total });
  };

  return (
    <section className="wrap py-8 sm:py-10 lg:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-tint p-5 sm:p-10 print:bg-white print:p-0">
          <span className="grid size-14 place-items-center rounded-full bg-mint text-navy print:hidden">
            <CheckIcon className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-[-0.02em] text-navy sm:text-[38px]">
            {justPlaced ? "Shukriya! We have your order." : `Order ${order.id}`}
          </h1>
          <p className="mt-3 text-[16px] text-ink">
            Order <strong className="text-navy">{order.id}</strong> placed on {formatDate(order.placedAt, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}. Keep this number; you need it to track the order.
          </p>

          <div className="mt-6">
            <PaymentCard order={order} whatsapp={whatsapp} onShare={share} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            <Button to={`/track-order?id=${encodeURIComponent(order.id)}`} variant="navy" arrow>
              Track this order
            </Button>
            <Button variant="ghost" onClick={() => window.print()}>
              Print receipt
            </Button>
            <Button to="/shop" variant="ghost">
              Continue shopping
            </Button>
          </div>
        </div>

        {!closed.includes(order.status) && (
          <div className="mt-8 print:hidden">
            <h2 className="font-display text-[20px] font-extrabold text-navy">What happens next</h2>
            <div className="mt-4">
              <NextSteps order={order} />
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-6 sm:space-y-8">
            <TrackingCard order={order} />
            <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <h2 className="font-display text-[20px] font-extrabold text-navy">Order progress</h2>
              <div className="mt-5">
                <OrderTimeline order={order} />
              </div>
            </div>
            <div className="grid gap-6 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Delivering to</h3>
                <p className="mt-2 text-[15px] font-semibold text-navy">{order.customer?.name}</p>
                <p className="text-[14px] text-ink">{order.customer?.address}</p>
                <p className="text-[14px] text-ink">{order.customer?.city}{order.customer?.province ? `, ${order.customer.province}` : ""}</p>
                <p className="text-[14px] text-ink">{order.customer?.phone}</p>
                {order.customer?.instructions && <p className="mt-1 text-[13px] text-ink-light">Note: {order.customer.instructions}</p>}
              </div>
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Payment</h3>
                <p className="mt-2 text-[15px] font-semibold text-navy">{paymentLabel(order.payment)}</p>
                {plan.advance > 0 && (
                  <p className="text-[14px] text-ink">
                    {formatPrice(plan.advance)} in advance{plan.balance > 0 ? `, ${formatPrice(plan.balance)} on delivery` : ""}
                  </p>
                )}
                {order.paymentStatus && <p className="mt-1 text-[13px] font-semibold text-navy">{paymentStatusLabel(order.paymentStatus)}</p>}
              </div>
            </div>
            <p className="text-[13px] text-ink-light print:hidden">
              Need to change something? <Link to="/contact" className="font-semibold text-teal hover:underline">Contact us</Link> before the order is packed.
            </p>
          </div>
          <OrderSummary lines={order.lines} totals={order.totals} coupon={order.coupon} advance={order.advance || { percent: 0, amount: 0, balance: order.totals.total }} editable={false} title="Items" />
        </div>
      </div>
    </section>
  );
}

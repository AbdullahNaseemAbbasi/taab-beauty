import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { ErrorState, Skeleton } from "../components/ui/Feedback.jsx";
import { CheckIcon, WhatsAppIcon, TruckIcon, PackageIcon, ExternalIcon } from "../components/ui/Icons.jsx";
import OrderSummary from "../components/commerce/OrderSummary.jsx";
import OrderTimeline from "../components/commerce/OrderTimeline.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { getOrder, phoneForOrder } from "../api/orders.js";
import { isLive } from "../api/client.js";
import { hydrateOrder } from "../lib/cart.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { estimateDelivery, formatDeliveryRange, courierInfo } from "../lib/shipping.js";
import { site } from "../config/site.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { ecommerce } from "../analytics/ecommerce.js";
import { track } from "../analytics/tracking.js";
import { EVENTS } from "../analytics/events.js";

/* Prefilled WhatsApp message the customer sends us to confirm the order (instant notification, no API needed). */
export function orderWhatsAppMessage(order) {
  const method = site.payments.methods.find((entry) => entry.id === order.payment)?.label || order.payment;
  const items = order.lines.map((line) => `• ${line.quantity} × ${line.product?.name || line.name}${line.variant?.name || line.variant ? ` (${line.variant?.name || line.variant})` : ""}`).join("\n");
  return [
    `Hi TAAB, confirming my order ${order.id}.`,
    "",
    items,
    "",
    `Total: ${formatPrice(order.totals.total)} (${method})`,
    `Name: ${order.customer?.name || ""}`,
    `Address: ${order.customer?.address || ""}, ${order.customer?.city || ""}`,
  ].join("\n");
}

function NextSteps({ order }) {
  const delivery = estimateDelivery(order.customer?.city, order.placedAt);
  const steps = [
    order.payment === "bank" && order.status === "created"
      ? { Icon: CheckIcon, title: "Complete the bank transfer", text: "Send the receipt on WhatsApp quoting your order number. We dispatch as soon as it is confirmed." }
      : { Icon: CheckIcon, title: "Order confirmed", text: "We have your order and will start packing it in our Karachi studio." },
    { Icon: PackageIcon, title: "Packed and handed to the courier", text: "Orders placed before 2pm ship the same working day. You receive the tracking number by SMS." },
    { Icon: TruckIcon, title: `Delivered ${delivery.express ? "next business day" : "in a few days"}`, text: `Expected ${formatDeliveryRange(delivery)}. ${order.payment === "cod" ? "Please keep the exact amount ready for the courier." : ""}` },
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
          text={status === "needs-phone" ? "For your privacy, orders can only be viewed with the phone number used at checkout." : "Check the order number from your confirmation SMS, or track it with your phone number."}
          action={{ label: "Track an order", to: `/track-order?id=${encodeURIComponent(id)}` }}
        />
      </section>
    );
  }

  const justPlaced = state?.justPlaced;
  const method = site.payments.methods.find((entry) => entry.id === order.payment);
  const whatsapp = whatsappLink(orderWhatsAppMessage(order));

  return (
    <section className="wrap py-8 sm:py-10 lg:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-tint p-5 sm:p-10 print:bg-white print:p-0">
          <span className="grid size-14 place-items-center rounded-full bg-mint text-navy print:hidden">
            <CheckIcon className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-[-0.02em] text-navy sm:text-[38px]">
            {justPlaced ? "Shukriya! Your order is confirmed." : `Order ${order.id}`}
          </h1>
          <p className="mt-3 text-[16px] text-ink">
            Order <strong className="text-navy">{order.id}</strong> placed on {formatDate(order.placedAt, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
            {order.customer?.phone && <> A confirmation SMS is on its way to {order.customer.phone}.</>}
          </p>

          <div className="mt-6 rounded-2xl border border-[#25D366]/40 bg-white p-4 print:hidden sm:p-5">
            <p className="text-[15px] font-semibold text-navy">Confirm faster on WhatsApp</p>
            <p className="mt-1 text-[14px] text-ink">Send us your order summary in one tap. We reply with the dispatch time and you can ask anything about your order in the same chat.</p>
            <Button href={whatsapp} target="_blank" rel="noreferrer" variant="whatsapp" className="mt-3 w-full sm:w-auto" onClick={() => { ecommerce.whatsapp("order_confirmation_share"); track(EVENTS.ORDER_WHATSAPP_SHARE, { transaction_id: order.id, value: order.totals.total }); }}>
              <WhatsAppIcon className="size-5" /> Send order details on WhatsApp
            </Button>
          </div>

          {order.payment === "bank" && order.status === "created" && (
            <div className="mt-5 rounded-xl border border-coral/30 bg-white p-4 text-[14px] text-navy">
              <p className="font-semibold">One more step: complete your bank transfer</p>
              <p className="mt-1">{site.payments.bankDetails.bank} · {site.payments.bankDetails.title} · <span className="font-mono">{site.payments.bankDetails.iban}</span></p>
              <p className="mt-1 text-ink">Send the receipt on WhatsApp quoting {order.id}. We dispatch as soon as it is confirmed.</p>
            </div>
          )}

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

        <div className="mt-8 print:hidden">
          <h2 className="font-display text-[20px] font-extrabold text-navy">What happens next</h2>
          <div className="mt-4">
            <NextSteps order={order} />
          </div>
        </div>

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
                <p className="mt-2 text-[15px] font-semibold text-navy">{method?.label || order.payment}</p>
                <p className="text-[14px] text-ink">{method?.description}</p>
                {order.paymentStatus && <p className="mt-1 text-[13px] capitalize text-ink-light">Status: {order.paymentStatus}</p>}
              </div>
            </div>
            <p className="text-[13px] text-ink-light print:hidden">
              Need to change something? <Link to="/contact" className="font-semibold text-teal hover:underline">Contact us</Link> within 2 hours of ordering.
            </p>
          </div>
          <OrderSummary lines={order.lines} totals={order.totals} coupon={order.coupon} editable={false} title="Items" />
        </div>
      </div>
    </section>
  );
}

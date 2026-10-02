import { useLocation, useParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { ErrorState } from "../components/ui/Feedback.jsx";
import { CheckIcon, WhatsAppIcon } from "../components/ui/Icons.jsx";
import OrderSummary from "../components/commerce/OrderSummary.jsx";
import OrderTimeline from "../components/commerce/OrderTimeline.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { getOrder } from "../lib/cart.js";
import { formatDate } from "../lib/format.js";
import { site } from "../config/site.js";
import { ecommerce } from "../analytics/ecommerce.js";

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const order = getOrder(id);
  useSeo({ title: order ? `Order ${order.id}` : "Order", path: `/order/${id}`, noindex: true });

  if (!order) {
    return (
      <section className="wrap py-16">
        <ErrorState title="We could not find that order" text="Check the order number from your confirmation SMS, or track it with your phone number." action={{ label: "Track an order", to: "/track-order" }} />
      </section>
    );
  }

  const justPlaced = state?.justPlaced;
  const method = site.payments.methods.find((entry) => entry.id === order.payment);

  return (
    <section className="wrap py-10 lg:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-tint p-6 sm:p-10">
          <span className="grid size-14 place-items-center rounded-full bg-mint text-navy">
            <CheckIcon className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-[30px] font-extrabold tracking-[-0.02em] text-navy sm:text-[38px]">
            {justPlaced ? "Shukriya! Your order is confirmed." : `Order ${order.id}`}
          </h1>
          <p className="mt-3 text-[16px] text-ink">
            Order <strong className="text-navy">{order.id}</strong> placed on {formatDate(order.placedAt, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
            {order.customer?.phone && <> A confirmation SMS is on its way to {order.customer.phone}.</>}
          </p>
          {order.payment === "bank" && order.status === "created" && (
            <div className="mt-5 rounded-xl border border-coral/30 bg-white p-4 text-[14px] text-navy">
              <p className="font-semibold">One more step: complete your bank transfer</p>
              <p className="mt-1">{site.payments.bankDetails.bank} · {site.payments.bankDetails.title} · <span className="font-mono">{site.payments.bankDetails.iban}</span></p>
              <p className="mt-1 text-ink">Send the receipt on WhatsApp quoting {order.id}. We dispatch as soon as it is confirmed.</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/track-order" variant="navy" arrow>
              Track this order
            </Button>
            <Button href={whatsappLink(`Hi TAAB, I have a question about order ${order.id}.`)} target="_blank" rel="noreferrer" variant="whatsapp" onClick={() => ecommerce.whatsapp("order_confirmation")}>
              <WhatsAppIcon className="size-5" /> Contact support
            </Button>
            <Button to="/shop" variant="ghost">
              Continue shopping
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-8">
            <div className="rounded-2xl border border-line bg-white p-6">
              <h2 className="font-display text-[20px] font-extrabold text-navy">Order progress</h2>
              <div className="mt-5">
                <OrderTimeline order={order} />
              </div>
            </div>
            <div className="grid gap-6 rounded-2xl border border-line bg-white p-6 sm:grid-cols-2">
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Delivering to</h3>
                <p className="mt-2 text-[15px] font-semibold text-navy">{order.customer?.name}</p>
                <p className="text-[14px] text-ink">{order.customer?.address}</p>
                <p className="text-[14px] text-ink">{order.customer?.city}{order.customer?.province ? `, ${order.customer.province}` : ""}</p>
                {order.customer?.instructions && <p className="mt-1 text-[13px] text-ink-light">Note: {order.customer.instructions}</p>}
              </div>
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Payment</h3>
                <p className="mt-2 text-[15px] font-semibold text-navy">{method?.label || order.payment}</p>
                <p className="text-[14px] text-ink">{method?.description}</p>
              </div>
            </div>
          </div>
          <OrderSummary lines={order.lines} totals={order.totals} coupon={order.coupon} editable={false} title="Items" />
        </div>
      </div>
    </section>
  );
}

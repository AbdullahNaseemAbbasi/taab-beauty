import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Overlay from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select, Textarea } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { SearchIcon, WhatsAppIcon, PhoneIcon, CheckIcon } from "../components/ui/Icons.jsx";
import OrderSummary from "../components/commerce/OrderSummary.jsx";
import OrderTimeline from "../components/commerce/OrderTimeline.jsx";
import { paymentStatusLabel } from "../components/commerce/PaymentPlan.jsx";
import { fetchOrders, updateOrderStatus, setPaymentStatus, subscribeToAdminChanges } from "../api/admin.js";
import { hydrateOrder } from "../lib/cart.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { site, paymentLabel } from "../config/site.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Chips, DataTable, PageTitle, StatusBadge, useAsync } from "./ui.jsx";
import { COURIERS, ORDER_STATUSES, mapOrder, nextStatus, statusLabel, waLink } from "./helpers.js";

const filters = [
  { id: "open", label: "Open" },
  { id: "created", label: "Awaiting advance" },
  { id: "all", label: "All" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "closed", label: "Cancelled / returned" },
];

const paymentTone = (status) => ({ pending: "gold", advance_paid: "teal", paid: "success" }[status] || "danger");

/* Message suggested for the customer for the order's current step. */
function customerMessage(order, status, tracking, courier) {
  const name = (order.customer?.name || "").split(" ")[0] || "there";
  const track = `${site.url}/track-order?id=${order.id}&phone=${order.phone}`;
  const { amount: advance, balance } = order.advance;
  const owes = balance > 0 && order.paymentStatus !== "paid";
  const account = site.payments.methods.find((method) => method.id === order.payment);
  switch (status) {
    case "created":
      return `Hi ${name}, thank you for your ${site.name} order ${order.id}. To confirm it, please send the advance of ${formatPrice(advance)} by ${paymentLabel(order.payment)}${account?.accountNumber ? ` to ${[account.bank, account.accountTitle, account.accountNumber].filter(Boolean).join(", ")}` : ""} and share the receipt here.${balance > 0 ? ` The remaining ${formatPrice(balance)} is paid on delivery.` : ""}`;
    case "confirmed":
      return `Hi ${name}, we have received your advance${advance ? ` of ${formatPrice(advance)}` : ""}. Your ${site.name} order ${order.id} is confirmed and we are packing it now. Track it here: ${track}`;
    case "packed":
      return `Hi ${name}, your ${site.name} order ${order.id} is packed and will be handed to the courier today.`;
    case "shipped":
      return `Hi ${name}, your ${site.name} order ${order.id} has shipped${courier ? ` with ${courier}` : ""}${tracking ? `. Tracking number: ${tracking}` : ""}.${owes ? ` ${formatPrice(balance)} is payable to the courier on delivery.` : ""} Track it here: ${track}`;
    case "out_for_delivery":
      return `Hi ${name}, your ${site.name} order ${order.id} is out for delivery today.${owes ? ` Please keep ${formatPrice(balance)} ready for the courier.` : ""}`;
    case "delivered":
      return `Hi ${name}, your ${site.name} order ${order.id} was delivered. We hope you love it! A quick review on the product page would mean a lot.`;
    case "cancelled":
      return `Hi ${name}, your ${site.name} order ${order.id} has been cancelled. Any advance you paid will be returned as described in our payment policy. Message us here if this was a mistake.`;
    default:
      return `Hi ${name}, an update on your ${site.name} order ${order.id}: ${statusLabel(status)}. Track it here: ${track}`;
  }
}

function OrderDrawer({ row, onClose, onChanged }) {
  const catalog = useCatalog();
  const { toast } = useStore();
  const order = hydrateOrder(mapOrder(row), catalog);
  const [form, setForm] = useState({ status: nextStatus(order.status), courier: order.courier || "TCS", tracking: order.trackingCode || "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsCourier = ["shipped", "out_for_delivery"].includes(form.status);
  const source = order.attribution?.lastTouch;
  const { amount: advance, balance, percent } = order.advance;
  const closed = ["cancelled", "failed", "returned", "refunded"].includes(order.status);

  async function saveStatus(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateOrderStatus(order.id, { status: form.status, note: form.note, courier: needsCourier ? form.courier : null, tracking: needsCourier ? form.tracking : null });
      toast(`Order ${order.id} marked as ${statusLabel(form.status).toLowerCase()}.`);
      onChanged(true);
      if (["cancelled", "returned"].includes(form.status)) catalog.reload();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(status, options, message) {
    setBusy(true);
    setError("");
    try {
      await setPaymentStatus(order.id, status, options);
      toast(message);
      onChanged(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay open onClose={onClose} side="right" title={`Order ${order.id}`} panelClass="!max-w-2xl">
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <Badge tone={paymentTone(order.paymentStatus)}>{paymentStatusLabel(order.paymentStatus)}</Badge>
          <span className="text-[13px] text-ink">{formatDate(order.placedAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        <section className="rounded-2xl border border-line p-4">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Customer</h3>
          <p className="mt-2 text-[16px] font-semibold text-navy">{order.customer.name}</p>
          <p className="text-[14px] text-ink">{order.customer.address}</p>
          <p className="text-[14px] text-ink">{order.customer.city}{order.customer.province ? `, ${order.customer.province}` : ""} {order.customer.postalCode || ""}</p>
          {order.customer.instructions && <p className="mt-1 text-[13px] text-ink-light">Delivery note: {order.customer.instructions}</p>}
          {order.notes && <p className="mt-1 text-[13px] text-ink-light">Order note: {order.notes}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${order.phone}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[14px] font-semibold text-navy hover:border-navy">
              <PhoneIcon className="size-4" /> {order.phone}
            </a>
            <a href={waLink(order.phone, customerMessage(order, order.status, order.trackingCode, order.courier))} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-[14px] font-semibold text-white">
              <WhatsAppIcon className="size-4" /> {order.paymentStatus === "pending" && !closed ? "Ask for the advance on WhatsApp" : "Message on WhatsApp"}
            </a>
          </div>
        </section>

        <section className={`rounded-2xl border p-4 ${order.paymentStatus === "pending" && !closed ? "border-coral/50 bg-coral-50" : "border-line"}`}>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Payment</h3>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-[14px] text-navy">
            <dt className="text-ink">Method for the advance</dt><dd className="font-semibold">{paymentLabel(order.payment)}</dd>
            <dt className="text-ink">Advance{percent ? ` (${percent}%)` : ""}</dt><dd className="font-semibold">{formatPrice(advance)}</dd>
            <dt className="text-ink">Balance on delivery</dt><dd className="font-semibold">{formatPrice(balance)}</dd>
            <dt className="text-ink">Order total</dt><dd className="font-bold">{formatPrice(order.totals.total)}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {order.paymentStatus === "pending" && !closed && (
              <Button
                variant="navy"
                size="sm"
                disabled={busy}
                onClick={() => recordPayment("advance_paid", { status: order.status === "created" ? "confirmed" : null, note: `Advance of ${formatPrice(advance)} received by ${paymentLabel(order.payment)}.` }, `Advance recorded. Order ${order.id} is confirmed.`)}
              >
                <CheckIcon className="size-4" /> Advance received, confirm order
              </Button>
            )}
            {order.paymentStatus === "advance_paid" && (
              <Button variant="navy" size="sm" disabled={busy} onClick={() => recordPayment("paid", { note: `Balance of ${formatPrice(balance)} received.` }, "Order marked as paid in full.")}>
                <CheckIcon className="size-4" /> Balance received
              </Button>
            )}
            <label className="flex items-center gap-2 text-[13px] text-ink">
              Set manually
              <Select value={order.paymentStatus} disabled={busy} onChange={(event) => recordPayment(event.target.value, {}, "Payment status updated.")} className="h-11 w-48 py-0 text-[14px]" aria-label="Payment status">
                {["pending", "advance_paid", "paid", "failed", "refunded"].map((value) => (
                  <option key={value} value={value}>{paymentStatusLabel(value)}</option>
                ))}
              </Select>
            </label>
          </div>
          {order.paymentStatus === "pending" && !closed && <p className="mt-3 text-[13px] text-ink">Check your bank or wallet app before confirming. The order stays unconfirmed, and is not packed, until the advance arrives.</p>}
        </section>

        <form onSubmit={saveStatus} className="rounded-2xl border border-line bg-tint p-4">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Update order</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="New status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {ORDER_STATUSES.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </Select>
            </Field>
            {needsCourier && (
              <>
                <Field label="Courier">
                  <Select value={form.courier} onChange={(event) => setForm({ ...form, courier: event.target.value })}>
                    {COURIERS.map((courier) => (
                      <option key={courier}>{courier}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tracking number" className="sm:col-span-2">
                  <Input value={form.tracking} onChange={(event) => setForm({ ...form, tracking: event.target.value })} placeholder="e.g. 7781992034" />
                </Field>
              </>
            )}
            <Field label="Note for the customer (optional)" className="sm:col-span-2">
              <Textarea rows={2} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Shown on the tracking page" />
            </Field>
          </div>
          {form.status === "confirmed" && order.paymentStatus === "pending" && <p className="mt-3 text-[13px] text-coral">The advance has not been recorded yet. Use “Advance received, confirm order” above so the payment is saved too.</p>}
          {needsCourier && balance > 0 && order.paymentStatus !== "paid" && <p className="mt-3 text-[13px] text-ink">Book the parcel with the courier to collect {formatPrice(balance)} on delivery.</p>}
          {["cancelled", "returned"].includes(form.status) && <p className="mt-3 text-[13px] text-ink">The items go back into stock automatically. Refund any advance separately, then set the payment to Refunded.</p>}
          {error && <p role="alert" className="mt-3 rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="navy" size="sm" disabled={busy}>
              {busy ? "Saving…" : "Save update"}
            </Button>
            <a href={waLink(order.phone, customerMessage(order, form.status, form.tracking, form.courier))} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-teal hover:underline">
              Send this update on WhatsApp
            </a>
          </div>
        </form>

        <OrderSummary lines={order.lines} totals={order.totals} coupon={order.coupon} advance={order.advance} editable={false} title="Items" />

        <section className="rounded-2xl border border-line p-4">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Where this order came from</h3>
          <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-1.5 text-[14px]">
            <dt className="text-ink">Source</dt><dd className="font-semibold capitalize text-navy">{source?.source || "direct"}</dd>
            {source?.utm_campaign && (<><dt className="text-ink">Campaign</dt><dd className="text-navy">{source.utm_campaign}</dd></>)}
            {source?.utm_content && (<><dt className="text-ink">Ad</dt><dd className="text-navy">{source.utm_content}</dd></>)}
            {(order.attribution?.creatorRef || order.creatorId) && (<><dt className="text-ink">Creator</dt><dd className="capitalize text-navy">{order.attribution?.creatorRef || order.creatorId}</dd></>)}
            {source?.landingPage && (<><dt className="text-ink">Landing page</dt><dd className="truncate text-navy">{source.landingPage}</dd></>)}
            <dt className="text-ink">Device</dt><dd className="capitalize text-navy">{order.attribution?.device || "unknown"}</dd>
          </dl>
        </section>

        <section className="rounded-2xl border border-line p-4">
          <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.2em] text-teal">Timeline</h3>
          <OrderTimeline order={order} />
        </section>
      </div>
    </Overlay>
  );
}

export default function OrdersPage() {
  const [status, setStatus] = useState("open");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [params, setParams] = useSearchParams();
  const orders = useAsync(() => fetchOrders({ status, search }), [status, search]);

  const loadOrder = (id) =>
    fetchOrders({ status: "all", search: id, limit: 1 })
      .then((rows) => rows[0] && setSelected(rows[0]))
      .catch(() => {});

  /* /admin/orders?order=NZ-... opens that order directly (used by phone notifications). */
  const linkedOrder = params.get("order");
  useEffect(() => {
    if (linkedOrder) loadOrder(linkedOrder);
  }, [linkedOrder]);

  /* New and changed orders show up without refreshing the page. */
  useEffect(() => subscribeToAdminChanges(({ table }) => table === "orders" && orders.reload()), [orders.reload]);

  const closeDrawer = () => {
    setSelected(null);
    if (linkedOrder) setParams({}, { replace: true });
  };

  return (
    <div className="space-y-5">
      <PageTitle title="Orders" subtitle="Confirm the advance, then pack, ship and track every order." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips options={filters} value={status} onChange={setStatus} />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput);
            if (searchInput) setStatus("all");
          }}
          className="relative w-full sm:w-72"
        >
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-light" />
          <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Order no., name or phone" aria-label="Search orders" className="h-11 py-0 pl-10" />
        </form>
      </div>

      <Async state={orders} rows={5}>
        {(rows) => (
          <DataTable
            rows={rows}
            onRowClick={setSelected}
            empty={search ? "No orders match that search." : "No orders in this view."}
            minWidth="min-w-[900px]"
            card={(row) => (
              <>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{row.id}</span>
                  <StatusBadge status={row.status} />
                </span>
                <span className="mt-2 block font-semibold">{row.customer?.name}</span>
                <span className="block text-[13px] text-ink-light">{row.customer?.city} · {row.phone}</span>
                <span className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <span className="text-[13px] text-ink">
                    {formatDate(row.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    <span className={`block font-semibold ${row.payment_status === "pending" ? "text-coral" : row.payment_status === "paid" ? "text-success" : "text-navy"}`}>{paymentStatusLabel(row.payment_status)}</span>
                  </span>
                  <strong className="text-[16px]">{formatPrice(row.total)}</strong>
                </span>
              </>
            )}
            columns={[
              { key: "id", label: "Order", render: (row) => <span className="font-semibold">{row.id}</span> },
              { key: "created_at", label: "Placed", render: (row) => formatDate(row.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
              { key: "customer", label: "Customer", render: (row) => (<span><span className="block font-semibold">{row.customer?.name}</span><span className="block text-[12px] text-ink-light">{row.customer?.city} · {row.phone}</span></span>) },
              { key: "items", label: "Items", render: (row) => (row.order_items || []).reduce((sum, item) => sum + item.quantity, 0) },
              {
                key: "payment",
                label: "Payment",
                render: (row) => (
                  <span>
                    <span className={`block font-semibold ${row.payment_status === "pending" ? "text-coral" : row.payment_status === "paid" ? "text-success" : ""}`}>{paymentStatusLabel(row.payment_status)}</span>
                    <span className="block text-[12px] text-ink-light">{paymentLabel(row.payment_method)} · advance {formatPrice(row.advance_amount || 0)}</span>
                  </span>
                ),
              },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { key: "total", label: "Total", align: "right", render: (row) => <strong>{formatPrice(row.total)}</strong> },
            ]}
          />
        )}
      </Async>

      {selected && (
        <OrderDrawer
          key={selected.id + selected.status + selected.payment_status}
          row={selected}
          onClose={closeDrawer}
          onChanged={(close = true) => {
            orders.reload();
            if (close) closeDrawer();
            else loadOrder(selected.id);
          }}
        />
      )}
    </div>
  );
}

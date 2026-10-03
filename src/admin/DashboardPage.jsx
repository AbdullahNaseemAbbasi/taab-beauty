import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchStats, fetchOrders } from "../api/admin.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { Async, Card, Chips, DataTable, PageTitle, Stat, StatusBadge, useAsync } from "./ui.jsx";
import { percent } from "./helpers.js";

const ranges = [
  { id: 1, label: "Today" },
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: 90, label: "90 days" },
];

const funnelSteps = [
  ["sessions", "Visitors"],
  ["view_item", "Product views"],
  ["add_to_cart", "Add to cart"],
  ["begin_checkout", "Checkout started"],
  ["purchase", "Purchases"],
];

function Funnel({ stats }) {
  const values = funnelSteps.map(([key, label]) => ({ label, value: key === "sessions" ? stats.sessions || 0 : stats.funnel?.[key] || 0 }));
  const top = Math.max(...values.map((step) => step.value), 1);
  return (
    <ul className="space-y-3">
      {values.map((step, index) => (
        <li key={step.label}>
          <div className="flex items-baseline justify-between text-[14px]">
            <span className="font-semibold text-navy">{step.label}</span>
            <span className="text-ink">
              <strong className="text-navy">{step.value.toLocaleString()}</strong>
              {index > 0 && <span className="ml-2 text-[12px] text-ink-light">{percent(step.value, values[index - 1].value)} of previous</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-tint">
            <div className={`h-full rounded-full ${index === values.length - 1 ? "bg-coral" : "bg-teal"}`} style={{ width: `${Math.max((step.value / top) * 100, step.value ? 2 : 0)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyBars({ daily }) {
  if (!daily.length) return <p className="py-8 text-center text-[14px] text-ink">No orders in this period yet.</p>;
  const top = Math.max(...daily.map((day) => day.revenue), 1);
  return (
    <div className="flex items-end justify-center gap-1.5">
      {daily.map((day) => (
        <div key={day.day} className="group flex min-w-0 max-w-[72px] flex-1 flex-col items-center" title={`${formatDate(day.day, { day: "numeric", month: "short" })}: ${formatPrice(day.revenue)} · ${day.orders} order${day.orders === 1 ? "" : "s"}`}>
          <span className="mb-1 hidden text-[10px] font-semibold text-navy sm:block">{day.orders}</span>
          <div className="w-full rounded-t-md bg-teal transition-colors group-hover:bg-coral" style={{ height: `${Math.max(Math.round((day.revenue / top) * 140), 4)}px` }} />
          <span className="mt-1.5 truncate text-[10px] text-ink-light">{formatDate(day.day, { day: "numeric", month: "short" })}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState(7);
  const navigate = useNavigate();
  const stats = useAsync(() => fetchStats(days), [days]);
  const recent = useAsync(() => fetchOrders({ limit: 8 }), []);

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" subtitle="How the store is doing and what needs your attention.">
        <Chips options={ranges} value={days} onChange={setDays} />
      </PageTitle>

      <Async state={stats} rows={4}>
        {(s) => {
          const purchases = s.funnel?.purchase || s.orders;
          return (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="Revenue" value={formatPrice(s.revenue)} hint={`${s.orders} order${s.orders === 1 ? "" : "s"}`} tone="teal" />
                <Stat label="Average order" value={formatPrice(s.orders ? s.revenue / s.orders : 0)} hint="Revenue ÷ orders" />
                <Stat label="Open orders" value={s.pending} hint={s.awaiting_payment ? `${s.awaiting_payment} awaiting bank transfer` : "To pack or ship"} tone={s.pending ? "coral" : "navy"} />
                <Stat label="Conversion" value={percent(purchases, s.sessions)} hint={`${(s.sessions || 0).toLocaleString()} visitors`} />
              </div>

              {(s.pending > 0 || s.pending_reviews > 0 || s.new_messages > 0 || s.low_stock.length > 0) && (
                <Card title="Needs attention">
                  <div className="flex flex-wrap gap-2">
                    {s.pending > 0 && <Link to="/admin/orders" className="rounded-full bg-coral px-4 py-2 text-[13px] font-semibold text-white hover:bg-coral-600">{s.pending} open order{s.pending === 1 ? "" : "s"}</Link>}
                    {s.awaiting_payment > 0 && <Link to="/admin/orders" className="rounded-full bg-gold px-4 py-2 text-[13px] font-semibold text-navy">{s.awaiting_payment} bank transfer{s.awaiting_payment === 1 ? "" : "s"} to confirm</Link>}
                    {s.pending_reviews > 0 && <Link to="/admin/reviews" className="rounded-full bg-navy px-4 py-2 text-[13px] font-semibold text-white">{s.pending_reviews} review{s.pending_reviews === 1 ? "" : "s"} to approve</Link>}
                    {s.new_messages > 0 && <Link to="/admin/inbox" className="rounded-full bg-teal px-4 py-2 text-[13px] font-semibold text-white">{s.new_messages} new message{s.new_messages === 1 ? "" : "s"}</Link>}
                    {s.low_stock.length > 0 && <Link to="/admin/products" className="rounded-full border border-coral px-4 py-2 text-[13px] font-semibold text-coral">{s.low_stock.length} product{s.low_stock.length === 1 ? "" : "s"} low on stock</Link>}
                  </div>
                </Card>
              )}

              <div className="grid gap-6 xl:grid-cols-2">
                <Card title="Sales by day"><DailyBars daily={s.daily} /></Card>
                <Card title="Customer journey"><Funnel stats={s} /></Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <Card title="Where orders come from">
                  {s.sources.length ? (
                    <ul className="divide-y divide-line">
                      {s.sources.map((source) => (
                        <li key={source.source} className="flex items-center justify-between py-2.5 text-[14px]">
                          <span className="font-semibold capitalize text-navy">{source.source}</span>
                          <span className="text-ink">{source.orders} · <strong className="text-navy">{formatPrice(source.revenue)}</strong></span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-center text-[14px] text-ink">No orders in this period yet.</p>
                  )}
                </Card>
                <Card title="Top products">
                  {s.top_products.length ? (
                    <ul className="divide-y divide-line">
                      {s.top_products.map((product) => (
                        <li key={product.slug || product.name} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                          <span className="truncate font-semibold text-navy">{product.name}</span>
                          <span className="shrink-0 text-ink">{product.units} sold · <strong className="text-navy">{formatPrice(product.revenue)}</strong></span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-center text-[14px] text-ink">Nothing sold in this period yet.</p>
                  )}
                </Card>
                <Card title="Low stock" action={<Link to="/admin/products" className="text-[13px] font-semibold text-teal hover:underline">Manage</Link>}>
                  {s.low_stock.length ? (
                    <ul className="divide-y divide-line">
                      {s.low_stock.map((product) => (
                        <li key={product.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                          <span className="truncate text-navy">{product.name}</span>
                          <span className={`shrink-0 font-bold ${product.stock === 0 ? "text-danger" : "text-coral"}`}>{product.stock} left</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-center text-[14px] text-ink">Every product is well stocked.</p>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="New customers" value={s.new_customers} hint="In this period" />
                <Stat label="Repeat customers" value={s.repeat_customers} hint="Ordered twice or more" tone="success" />
                <Stat label="WhatsApp clicks" value={s.funnel?.whatsapp_click || 0} hint="From the storefront" />
                <Stat label="Subscribers" value={s.subscribers} hint="Newsletter list" />
              </div>
            </>
          );
        }}
      </Async>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-extrabold text-navy">Latest orders</h2>
          <Link to="/admin/orders" className="text-[13px] font-semibold text-teal hover:underline">All orders</Link>
        </div>
        <Async state={recent} rows={3}>
          {(rows) => (
            <DataTable
              rows={rows}
              empty="No orders yet. They appear here the moment a customer checks out."
              onRowClick={(row) => navigate(`/admin/orders?order=${row.id}`)}
              card={(row) => (
                <>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{row.id}</span>
                    <StatusBadge status={row.status} />
                  </span>
                  <span className="mt-2 flex items-end justify-between gap-3">
                    <span className="text-[13px] text-ink">{row.customer?.name} · {row.customer?.city}</span>
                    <strong>{formatPrice(row.total)}</strong>
                  </span>
                </>
              )}
              columns={[
                { key: "id", label: "Order", render: (row) => <span className="font-semibold">{row.id}</span> },
                { key: "created_at", label: "Placed", render: (row) => formatDate(row.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
                { key: "customer", label: "Customer", render: (row) => `${row.customer?.name || ""} · ${row.customer?.city || ""}` },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
                { key: "total", label: "Total", align: "right", render: (row) => <strong>{formatPrice(row.total)}</strong> },
              ]}
            />
          )}
        </Async>
      </div>
    </div>
  );
}

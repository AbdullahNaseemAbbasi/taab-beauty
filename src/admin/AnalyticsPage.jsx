import { useState } from "react";
import { fetchReport } from "../api/admin.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { Async, Chips, DataTable, PageTitle, useAsync } from "./ui.jsx";
import { downloadCsv, percent } from "./helpers.js";

const tabs = [
  { id: "report_daily_sales", label: "Daily sales" },
  { id: "report_funnel_daily", label: "Daily funnel" },
  { id: "report_sources", label: "Sources & campaigns" },
  { id: "report_product_performance", label: "Products" },
];

const day = (value) => formatDate(value, { weekday: "short", day: "numeric", month: "short" });

const columns = {
  report_daily_sales: [
    { key: "day", label: "Day", render: (row) => <span className="font-semibold">{day(row.day)}</span> },
    { key: "orders", label: "Orders", align: "right" },
    { key: "revenue", label: "Revenue", align: "right", render: (row) => <strong>{formatPrice(row.revenue)}</strong> },
    { key: "average_order", label: "Avg order", align: "right", render: (row) => formatPrice(row.average_order) },
    { key: "discounts", label: "Discounts", align: "right", render: (row) => formatPrice(row.discounts) },
    { key: "cod_orders", label: "COD", align: "right" },
    { key: "bank_orders", label: "Bank", align: "right" },
    { key: "delivered", label: "Delivered", align: "right" },
    { key: "lost", label: "Cancelled / returned", align: "right", render: (row) => <span className={row.lost ? "text-danger" : ""}>{row.lost}</span> },
  ],
  report_funnel_daily: [
    { key: "day", label: "Day", render: (row) => <span className="font-semibold">{day(row.day)}</span> },
    { key: "sessions", label: "Visitors", align: "right" },
    { key: "product_views", label: "Product views", align: "right" },
    { key: "add_to_carts", label: "Add to cart", align: "right" },
    { key: "checkouts_started", label: "Checkout", align: "right" },
    { key: "purchases", label: "Purchases", align: "right", render: (row) => <strong>{row.purchases}</strong> },
    { key: "conversion", label: "Conversion", align: "right", render: (row) => percent(row.purchases, row.sessions) },
    { key: "whatsapp_clicks", label: "WhatsApp", align: "right" },
    { key: "searches", label: "Searches", align: "right" },
  ],
  report_sources: [
    { key: "source", label: "Source", render: (row) => <span className="font-semibold capitalize">{row.source}</span> },
    { key: "campaign", label: "Campaign", render: (row) => row.campaign || "—" },
    { key: "ad_content", label: "Ad", render: (row) => row.ad_content || "—" },
    { key: "creator", label: "Creator", render: (row) => <span className="capitalize">{row.creator || "—"}</span> },
    { key: "orders", label: "Orders", align: "right" },
    { key: "revenue", label: "Revenue", align: "right", render: (row) => <strong>{formatPrice(row.revenue)}</strong> },
    { key: "average_order", label: "Avg order", align: "right", render: (row) => formatPrice(row.average_order) },
  ],
  report_product_performance: [
    { key: "name", label: "Product", render: (row) => (<span><span className="block font-semibold">{row.name}</span><span className="block text-[12px] text-ink-light">{row.sku}</span></span>) },
    { key: "views", label: "Views", align: "right" },
    { key: "add_to_carts", label: "Add to cart", align: "right" },
    { key: "units_sold", label: "Sold", align: "right" },
    { key: "rate", label: "View → sale", align: "right", render: (row) => percent(row.orders, row.views) },
    { key: "revenue", label: "Revenue", align: "right", render: (row) => <strong>{formatPrice(row.revenue)}</strong> },
    { key: "gross_profit", label: "Gross profit", align: "right", render: (row) => <span className="text-success">{formatPrice(row.gross_profit)}</span> },
    { key: "stock", label: "Stock", align: "right" },
    { key: "waiting_for_stock", label: "Waiting", align: "right" },
  ],
};

const notes = {
  report_daily_sales: "Revenue is the order total customers pay. Cancelled and returned orders are counted in the last column, not in revenue targets.",
  report_funnel_daily: "Each row is one day of storefront activity. Conversion is purchases divided by visitors.",
  report_sources: "Where paying customers came from, based on the link they last arrived through (UTM tags and creator links).",
  report_product_performance: "Gross profit is revenue minus your product cost. It does not include ad spend, packaging or delivery; ROAS is not profit.",
};

export default function AnalyticsPage() {
  const [view, setView] = useState("report_daily_sales");
  const report = useAsync(() => fetchReport(view, view === "report_product_performance" ? 200 : 60), [view]);

  return (
    <div className="space-y-5">
      <PageTitle title="Analytics" subtitle="Sales, the customer journey, campaigns and product performance.">
        <button type="button" onClick={() => downloadCsv(`taab-${view}.csv`, report.data || [])} className="h-10 rounded-full border border-line bg-white px-4 text-[14px] font-semibold text-navy hover:border-navy" disabled={!report.data?.length}>
          Export CSV
        </button>
      </PageTitle>
      <Chips options={tabs} value={view} onChange={setView} />
      <p className="text-[14px] text-ink">{notes[view]}</p>
      <Async state={report} rows={5}>
        {(rows) => <DataTable rows={rows} rowKey={(row, index) => `${view}-${index}`} columns={columns[view]} minWidth="min-w-[860px]" empty="No data yet. It fills in as visitors and orders arrive." />}
      </Async>
    </div>
  );
}

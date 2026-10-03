import { useState } from "react";
import { Badge } from "../components/ui/Typography.jsx";
import { WhatsAppIcon, MailIcon } from "../components/ui/Icons.jsx";
import { fetchMessages, setMessageStatus, fetchSubscribers, fetchStockAlerts, markAlertNotified, fetchAbandoned } from "../api/admin.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { site } from "../config/site.js";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Chips, DataTable, PageTitle, useAsync } from "./ui.jsx";
import { downloadCsv, waLink } from "./helpers.js";

const tabs = [
  { id: "messages", label: "Messages" },
  { id: "abandoned", label: "Abandoned checkouts" },
  { id: "alerts", label: "Back-in-stock requests" },
  { id: "subscribers", label: "Newsletter" },
];

const when = (value) => formatDate(value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Messages() {
  const messages = useAsync(fetchMessages, []);
  const { toast } = useStore();
  async function mark(id, status) {
    try {
      await setMessageStatus(id, status);
      messages.reload();
    } catch (error) {
      toast(error.message, { type: "error" });
    }
  }
  return (
    <Async state={messages} rows={3}>
      {(rows) =>
        rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center text-[15px] text-ink">No messages yet. The contact form writes here.</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((message) => (
              <li key={message.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Badge tone={message.status === "new" ? "coral" : message.status === "replied" ? "success" : "muted"}>{message.status}</Badge>
                  <span className="text-[15px] font-semibold text-navy">{message.name}</span>
                  <span className="text-[13px] text-ink-light">{message.topic}</span>
                  <span className="ml-auto text-[13px] text-ink-light">{when(message.created_at)}</span>
                </div>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.6] text-ink">{message.message}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.topic || "Your message to TAAB"}`)}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[14px] font-semibold text-navy hover:border-navy">
                    <MailIcon className="size-4" /> {message.email}
                  </a>
                  {message.phone && (
                    <a href={waLink(message.phone, `Hi ${message.name.split(" ")[0]}, this is TAAB replying to your message.`)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-[14px] font-semibold text-white">
                      <WhatsAppIcon className="size-4" /> WhatsApp
                    </a>
                  )}
                  {message.status !== "replied" && (
                    <button type="button" onClick={() => mark(message.id, "replied")} className="h-10 rounded-full bg-navy px-4 text-[14px] font-semibold text-white">
                      Mark as replied
                    </button>
                  )}
                  {message.status !== "closed" && (
                    <button type="button" onClick={() => mark(message.id, "closed")} className="h-10 rounded-full px-4 text-[14px] font-semibold text-ink hover:bg-tint">
                      Close
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </Async>
  );
}

function Abandoned() {
  const sessions = useAsync(fetchAbandoned, []);
  return (
    <Async state={sessions} rows={3}>
      {(rows) => (
        <DataTable
          rows={rows}
          rowKey="session_id"
          empty="No abandoned checkouts. Shoppers who enter a phone number but do not order appear here."
          columns={[
            { key: "name", label: "Shopper", render: (row) => (<span><span className="block font-semibold">{row.name || "No name"}</span><span className="block text-[12px] text-ink-light">{row.city || ""}</span></span>) },
            { key: "lines", label: "In the bag", render: (row) => <span className="text-[13px] text-ink">{(row.lines || []).map((line) => `${line.quantity} × ${line.name || line.sku}`).join(", ")}</span> },
            { key: "subtotal", label: "Value", align: "right", render: (row) => <strong>{formatPrice(row.subtotal)}</strong> },
            { key: "source", label: "Source", render: (row) => <span className="capitalize">{row.source || "direct"}</span> },
            { key: "last_seen", label: "Last seen", render: (row) => when(row.last_seen) },
            {
              key: "action",
              label: "",
              align: "right",
              render: (row) => (
                <a href={waLink(row.phone, `Hi ${(row.name || "").split(" ")[0] || "there"}, this is TAAB. You left a few items in your bag. Can we help you finish the order or answer any question? ${site.url}/cart`)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#25D366] px-3 text-[13px] font-semibold text-white">
                  <WhatsAppIcon className="size-4" /> Follow up
                </a>
              ),
            },
          ]}
        />
      )}
    </Async>
  );
}

function StockAlerts() {
  const alerts = useAsync(fetchStockAlerts, []);
  const { toast } = useStore();
  async function done(id) {
    try {
      await markAlertNotified(id);
      alerts.reload();
    } catch (error) {
      toast(error.message, { type: "error" });
    }
  }
  return (
    <Async state={alerts} rows={3}>
      {(rows) => (
        <DataTable
          rows={rows}
          empty="Nobody is waiting for a restock."
          columns={[
            { key: "product", label: "Product", render: (row) => (<span><span className="block font-semibold">{row.products?.name}</span>{row.variant_id && <span className="block text-[12px] text-ink-light">{row.products?.variants?.options?.find((option) => option.id === row.variant_id)?.name || row.variant_id}</span>}</span>) },
            {
              key: "contact",
              label: "Contact",
              render: (row) =>
                row.channel === "phone" ? (
                  <a href={waLink(row.contact, `Good news from TAAB: ${row.products?.name} is back in stock. ${site.url}/product/${row.products?.slug}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-teal hover:underline">
                    <WhatsAppIcon className="size-4 text-[#25D366]" /> {row.contact}
                  </a>
                ) : (
                  <a href={`mailto:${row.contact}?subject=${encodeURIComponent(`${row.products?.name} is back in stock`)}`} className="font-semibold text-teal hover:underline">{row.contact}</a>
                ),
            },
            { key: "created_at", label: "Requested", render: (row) => when(row.created_at) },
            { key: "status", label: "Status", render: (row) => (row.notified_at ? <Badge tone="success">Notified</Badge> : <Badge tone="gold">Waiting</Badge>) },
            { key: "action", label: "", align: "right", render: (row) => !row.notified_at && (<button type="button" onClick={() => done(row.id)} className="h-9 rounded-full border border-line px-3 text-[13px] font-semibold text-navy hover:border-navy">Mark notified</button>) },
          ]}
        />
      )}
    </Async>
  );
}

function Subscribers() {
  const subscribers = useAsync(fetchSubscribers, []);
  return (
    <Async state={subscribers} rows={3}>
      {(rows) => (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-ink"><strong className="text-navy">{rows.length}</strong> subscriber{rows.length === 1 ? "" : "s"}</p>
            <button type="button" onClick={() => downloadCsv("taab-newsletter.csv", rows.map(({ email, source, created_at }) => ({ email, source, subscribed_at: created_at })))} className="h-10 rounded-full border border-line bg-white px-4 text-[14px] font-semibold text-navy hover:border-navy" disabled={!rows.length}>
              Export CSV
            </button>
          </div>
          <DataTable
            rows={rows}
            minWidth="min-w-[480px]"
            empty="No subscribers yet."
            columns={[
              { key: "email", label: "Email", render: (row) => <span className="font-semibold">{row.email}</span> },
              { key: "source", label: "Signed up from" },
              { key: "created_at", label: "Date", render: (row) => when(row.created_at) },
            ]}
          />
        </>
      )}
    </Async>
  );
}

export default function InboxPage() {
  const [tab, setTab] = useState("messages");
  return (
    <div className="space-y-5">
      <PageTitle title="Inbox" subtitle="Messages, shoppers to follow up with and people waiting for stock." />
      <Chips options={tabs} value={tab} onChange={setTab} />
      {tab === "messages" && <Messages />}
      {tab === "abandoned" && <Abandoned />}
      {tab === "alerts" && <StockAlerts />}
      {tab === "subscribers" && <Subscribers />}
    </div>
  );
}

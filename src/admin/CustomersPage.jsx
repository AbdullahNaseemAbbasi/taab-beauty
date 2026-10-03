import { useMemo, useState } from "react";
import { Input } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { SearchIcon, WhatsAppIcon } from "../components/ui/Icons.jsx";
import { fetchCustomers } from "../api/admin.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { Async, Chips, DataTable, PageTitle, useAsync } from "./ui.jsx";
import { downloadCsv, waLink } from "./helpers.js";

const segments = [
  { id: "all", label: "All" },
  { id: "first_time", label: "First order" },
  { id: "repeat", label: "Repeat" },
  { id: "high_value", label: "High value" },
  { id: "inactive", label: "Inactive" },
];
const segmentTone = { first_time: "teal", repeat: "navy", high_value: "gold", inactive: "muted", new: "muted" };
const segmentLabel = { first_time: "First order", repeat: "Repeat", high_value: "High value", inactive: "Inactive", new: "New" };

export default function CustomersPage() {
  const customers = useAsync(fetchCustomers, []);
  const [segment, setSegment] = useState("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (customers.data || []).filter((row) => (segment === "all" || row.segment === segment) && (!term || `${row.name} ${row.phone} ${row.city} ${row.email || ""}`.toLowerCase().includes(term)));
  }, [customers.data, segment, search]);

  return (
    <div className="space-y-5">
      <PageTitle title="Customers" subtitle="Everyone who has ordered, grouped by how they buy.">
        <button type="button" onClick={() => downloadCsv("naz-customers.csv", visible)} className="h-10 rounded-full border border-line bg-white px-4 text-[14px] font-semibold text-navy hover:border-navy">
          Export CSV
        </button>
      </PageTitle>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips options={segments} value={segment} onChange={setSegment} />
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-light" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone or city" aria-label="Search customers" className="h-11 py-0 pl-10" />
        </div>
      </div>

      <Async state={customers} rows={5}>
        {() => (
          <DataTable
            rows={visible}
            rowKey="phone"
            empty="No customers yet. They appear after the first order."
            card={(row) => (
              <>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{row.name || "Unknown"}</span>
                  <Badge tone={segmentTone[row.segment] || "muted"}>{segmentLabel[row.segment] || row.segment}</Badge>
                </span>
                <a href={waLink(row.phone)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 font-semibold text-teal"><WhatsAppIcon className="size-4 text-[#25D366]" /> {row.phone}</a>
                <span className="mt-2 flex items-end justify-between gap-3 border-t border-line pt-2 text-[13px] text-ink">
                  <span>{row.city || ""} · {row.orders_count} order{row.orders_count === 1 ? "" : "s"}</span>
                  <strong className="text-[15px] text-navy">{formatPrice(row.total_spent)}</strong>
                </span>
              </>
            )}
            columns={[
              { key: "name", label: "Customer", render: (row) => (<span><span className="block font-semibold">{row.name || "Unknown"}</span><span className="block text-[12px] text-ink-light">{row.city || ""}{row.email ? ` · ${row.email}` : ""}</span></span>) },
              { key: "phone", label: "Phone", render: (row) => (<a href={waLink(row.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-teal hover:underline"><WhatsAppIcon className="size-4 text-[#25D366]" /> {row.phone}</a>) },
              { key: "orders_count", label: "Orders", align: "right" },
              { key: "total_spent", label: "Spent", align: "right", render: (row) => <strong>{formatPrice(row.total_spent)}</strong> },
              { key: "last_order_at", label: "Last order", render: (row) => (row.last_order_at ? formatDate(row.last_order_at) : "") },
              { key: "segment", label: "Segment", render: (row) => <Badge tone={segmentTone[row.segment] || "muted"}>{segmentLabel[row.segment] || row.segment}</Badge> },
            ]}
          />
        )}
      </Async>
    </div>
  );
}

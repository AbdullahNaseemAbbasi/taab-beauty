import { useState } from "react";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { fetchCoupons, saveCoupon, deleteCoupon } from "../api/admin.js";
import { formatPrice } from "../lib/format.js";
import { site } from "../config/site.js";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Card, DataTable, PageTitle, useAsync } from "./ui.jsx";

const blank = { code: "", type: "percent", value: 10, min_order: 0, description: "", creator_id: "", usage_limit: "" };

function describe(coupon) {
  if (coupon.type === "percent") return `${coupon.value}% off`;
  if (coupon.type === "fixed") return `${formatPrice(coupon.value)} off`;
  return "Free delivery";
}

export default function CouponsPage() {
  const coupons = useAsync(fetchCoupons, []);
  const { toast } = useStore();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function create(event) {
    event.preventDefault();
    setError("");
    const code = form.code.trim().toUpperCase().replace(/\s+/g, "");
    if (code.length < 3) return setError("The code needs at least 3 characters.");
    setBusy(true);
    try {
      await saveCoupon({
        code,
        type: form.type,
        value: form.type === "shipping" ? 0 : Math.round(Number(form.value) || 0),
        min_order: Math.round(Number(form.min_order) || 0),
        description: form.description.trim() || null,
        creator_id: form.creator_id.trim().toLowerCase() || null,
        usage_limit: form.usage_limit ? Math.round(Number(form.usage_limit)) : null,
        active: true,
      });
      toast(`Code ${code} saved.`);
      setForm(blank);
      coupons.reload();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  async function act(action, message) {
    try {
      await action();
      if (message) toast(message);
      coupons.reload();
    } catch (actionError) {
      toast(actionError.message, { type: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Coupons & creators" subtitle="Discount codes, and codes tied to an influencer so their sales are tracked." />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px] xl:items-start">
        <Async state={coupons} rows={4}>
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey="code"
              empty="No codes yet. Create the first one on the right."
              columns={[
                { key: "code", label: "Code", render: (row) => (<span><span className="block font-mono text-[14px] font-bold">{row.code}</span><span className="block text-[12px] text-ink-light">{row.description}</span></span>) },
                { key: "type", label: "Discount", render: (row) => (<span>{describe(row)}{row.min_order > 0 && <span className="block text-[12px] text-ink-light">over {formatPrice(row.min_order)}</span>}</span>) },
                {
                  key: "creator_id",
                  label: "Creator link",
                  render: (row) =>
                    row.creator_id ? (
                      <button type="button" title="Copy link" onClick={() => navigator.clipboard.writeText(`${site.url}/?ref=${row.creator_id}`).then(() => toast("Creator link copied."))} className="text-left">
                        <span className="block font-semibold capitalize text-navy">{row.creator_id}</span>
                        <span className="block text-[12px] text-teal">/?ref={row.creator_id} · copy</span>
                      </button>
                    ) : (
                      <span className="text-ink-light">Store code</span>
                    ),
                },
                { key: "used_count", label: "Used", align: "right", render: (row) => `${row.used_count}${row.usage_limit ? ` / ${row.usage_limit}` : ""}` },
                { key: "active", label: "Status", render: (row) => <Badge tone={row.active ? "success" : "muted"}>{row.active ? "Active" : "Off"}</Badge> },
                {
                  key: "action",
                  label: "",
                  align: "right",
                  render: (row) => (
                    <span className="flex justify-end gap-2">
                      <button type="button" onClick={() => act(() => saveCoupon({ ...row, active: !row.active }))} className="h-9 rounded-full border border-line px-3 text-[13px] font-semibold text-navy hover:border-navy">
                        {row.active ? "Turn off" : "Turn on"}
                      </button>
                      <button type="button" onClick={() => window.confirm(`Delete ${row.code}?`) && act(() => deleteCoupon(row.code), "Code deleted.")} className="h-9 rounded-full px-3 text-[13px] font-semibold text-danger hover:bg-coral-50">
                        Delete
                      </button>
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Async>

        <Card title="Create a code">
          <form onSubmit={create} className="grid gap-4">
            <Field label="Code" required hint="What the customer types, e.g. EID20"><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select value={form.type} onChange={set("type")}>
                  <option value="percent">Percent off</option>
                  <option value="fixed">Rupees off</option>
                  <option value="shipping">Free delivery</option>
                </Select>
              </Field>
              {form.type !== "shipping" && <Field label={form.type === "percent" ? "Percent" : "Amount (Rs.)"}><Input type="number" min="1" value={form.value} onChange={set("value")} /></Field>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum order (Rs.)"><Input type="number" min="0" value={form.min_order} onChange={set("min_order")} /></Field>
              <Field label="Usage limit" hint="Empty = unlimited"><Input type="number" min="1" value={form.usage_limit} onChange={set("usage_limit")} /></Field>
            </div>
            <Field label="Creator name (optional)" hint="Creates the link /?ref=name and credits their sales"><Input value={form.creator_id} onChange={set("creator_id")} placeholder="e.g. hira" /></Field>
            <Field label="Description"><Input value={form.description} onChange={set("description")} placeholder="Shown in reports" /></Field>
            {error && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">{error}</p>}
            <Button type="submit" variant="navy" disabled={busy}>{busy ? "Saving…" : "Save code"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

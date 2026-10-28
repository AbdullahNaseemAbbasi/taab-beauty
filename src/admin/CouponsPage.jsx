import { useRef, useState } from "react";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { fetchCoupons, createCoupon, updateCoupon, setCouponActive, deleteCoupon } from "../api/admin.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { site } from "../config/site.js";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Card, DataTable, PageTitle, useAsync } from "./ui.jsx";
import { toSlug } from "./helpers.js";

const blank = { code: "", type: "percent", value: 10, min_order: 0, description: "", creator_id: "", usage_limit: "", starts_at: "", ends_at: "" };

/* Date inputs work in Pakistan time: a code runs from the start of its first day to the end of its last. */
const toDay = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }) : "");
const fromDay = (day, end = false) => (day ? new Date(`${day}T${end ? "23:59:59" : "00:00:00"}+05:00`).toISOString() : null);

function describe(coupon) {
  if (coupon.type === "percent") return `${coupon.value}% off`;
  if (coupon.type === "fixed") return `${formatPrice(coupon.value)} off`;
  return "Free delivery";
}

function couponStatus(coupon) {
  const now = Date.now();
  if (!coupon.active) return { tone: "muted", label: "Off" };
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return { tone: "gold", label: "Scheduled" };
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return { tone: "muted", label: "Ended" };
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return { tone: "muted", label: "Used up" };
  return { tone: "success", label: "Active" };
}

export default function CouponsPage() {
  const coupons = useAsync(fetchCoupons, []);
  const { toast } = useStore();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null); // code being edited, or null for a new code
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  function startEdit(row) {
    setEditing(row.code);
    setError("");
    setForm({
      code: row.code,
      type: row.type,
      value: row.value,
      min_order: row.min_order || 0,
      description: row.description || "",
      creator_id: row.creator_id || "",
      usage_limit: row.usage_limit || "",
      starts_at: toDay(row.starts_at),
      ends_at: toDay(row.ends_at),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(blank);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const code = editing || form.code.trim().toUpperCase().replace(/\s+/g, "");
    const value = form.type === "shipping" ? 0 : Math.round(Number(form.value) || 0);
    const creator = toSlug(form.creator_id);
    if (code.length < 3) return setError("The code needs at least 3 characters.");
    if (!editing && !/^[A-Z0-9_-]+$/.test(code)) return setError("Use only letters, numbers, - and _ in the code.");
    if (form.type === "percent" && !(value >= 1 && value <= 100)) return setError("A percent discount must be between 1 and 100.");
    if (form.type === "fixed" && !(value > 0)) return setError("Enter how many rupees the code takes off.");
    if (form.creator_id.trim() && !creator) return setError("Write the creator name with English letters or numbers, e.g. hira.");
    if (form.starts_at && form.ends_at && form.ends_at < form.starts_at) return setError("The end date is before the start date.");
    const coupon = {
      code,
      type: form.type,
      value,
      min_order: Math.max(0, Math.round(Number(form.min_order) || 0)),
      description: form.description.trim() || null,
      creator_id: creator || null,
      usage_limit: form.usage_limit ? Math.max(1, Math.round(Number(form.usage_limit))) : null,
      starts_at: fromDay(form.starts_at),
      ends_at: fromDay(form.ends_at, true),
    };
    setBusy(true);
    try {
      if (editing) await updateCoupon(editing, coupon);
      else await createCoupon({ ...coupon, active: true });
      toast(editing ? `Code ${code} updated.` : `Code ${code} saved.`);
      cancelEdit();
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

  async function copyLink(creatorId) {
    const link = `${site.url}/?ref=${creatorId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast("Creator link copied.");
    } catch {
      toast(`Could not copy automatically. The link is ${link}`, { type: "error", duration: 9000 });
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
              minWidth="min-w-[860px]"
              columns={[
                { key: "code", label: "Code", render: (row) => (<span><span className="block font-mono text-[14px] font-bold">{row.code}</span><span className="block text-[12px] text-ink-light">{row.description}</span></span>) },
                {
                  key: "type",
                  label: "Discount",
                  render: (row) => (
                    <span>
                      {describe(row)}
                      {row.min_order > 0 && <span className="block text-[12px] text-ink-light">over {formatPrice(row.min_order)}</span>}
                      {(row.starts_at || row.ends_at) && <span className="block text-[12px] text-ink-light">{row.starts_at ? `from ${formatDate(row.starts_at)}` : ""}{row.starts_at && row.ends_at ? " " : ""}{row.ends_at ? `until ${formatDate(row.ends_at)}` : ""}</span>}
                    </span>
                  ),
                },
                {
                  key: "creator_id",
                  label: "Creator link",
                  render: (row) =>
                    row.creator_id ? (
                      <button type="button" title="Copy link" onClick={() => copyLink(row.creator_id)} className="text-left">
                        <span className="block font-semibold capitalize text-navy">{row.creator_id}</span>
                        <span className="block text-[12px] text-teal">/?ref={row.creator_id} · copy</span>
                      </button>
                    ) : (
                      <span className="text-ink-light">Store code</span>
                    ),
                },
                { key: "used_count", label: "Used", align: "right", render: (row) => `${row.used_count}${row.usage_limit ? ` / ${row.usage_limit}` : ""}` },
                { key: "active", label: "Status", render: (row) => { const status = couponStatus(row); return <Badge tone={status.tone}>{status.label}</Badge>; } },
                {
                  key: "action",
                  label: "",
                  align: "right",
                  render: (row) => (
                    <span className="flex justify-end gap-2">
                      <button type="button" onClick={() => startEdit(row)} className="h-9 rounded-full border border-line px-3 text-[13px] font-semibold text-navy hover:border-navy">
                        Edit
                      </button>
                      <button type="button" onClick={() => act(() => setCouponActive(row.code, !row.active), row.active ? `${row.code} turned off.` : `${row.code} turned on.`)} className="h-9 rounded-full border border-line px-3 text-[13px] font-semibold text-navy hover:border-navy">
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

        <div ref={formRef} className="scroll-mt-24">
          <Card title={editing ? `Edit ${editing}` : "Create a code"}>
            <form onSubmit={submit} className="grid gap-4">
              <Field label="Code" required hint={editing ? "The code itself can’t be changed. Create a new one instead." : "What the customer types, e.g. EID20"}>
                <Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required disabled={Boolean(editing)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <Select value={form.type} onChange={set("type")}>
                    <option value="percent">Percent off</option>
                    <option value="fixed">Rupees off</option>
                    <option value="shipping">Free delivery</option>
                  </Select>
                </Field>
                {form.type !== "shipping" && <Field label={form.type === "percent" ? "Percent (1 to 100)" : "Amount (Rs.)"}><Input type="number" min="1" max={form.type === "percent" ? 100 : undefined} value={form.value} onChange={set("value")} /></Field>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Minimum order (Rs.)"><Input type="number" min="0" value={form.min_order} onChange={set("min_order")} /></Field>
                <Field label="Usage limit" hint="Empty = unlimited"><Input type="number" min="1" value={form.usage_limit} onChange={set("usage_limit")} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts" hint="Optional"><Input type="date" value={form.starts_at} onChange={set("starts_at")} /></Field>
                <Field label="Ends" hint="Optional, last day included"><Input type="date" value={form.ends_at} onChange={set("ends_at")} /></Field>
              </div>
              <Field label="Creator name (optional)" hint={`Creates the link /?ref=${toSlug(form.creator_id) || "name"} and credits their sales`}><Input value={form.creator_id} onChange={set("creator_id")} placeholder="e.g. hira" /></Field>
              <Field label="Description"><Input value={form.description} onChange={set("description")} placeholder="Shown in reports" /></Field>
              {error && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" variant="navy" className="flex-1" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save code"}</Button>
                {editing && <Button type="button" variant="ghost" onClick={cancelEdit}>Cancel</Button>}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

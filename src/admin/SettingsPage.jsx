import { useEffect, useState } from "react";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Checkbox } from "../components/ui/Form.jsx";
import { fetchAllSettings, saveSetting, listAdmins, grantAdmin, revokeAdmin } from "../api/admin.js";
import { formatDate } from "../lib/format.js";
import { site } from "../config/site.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Card, PageTitle, useAsync } from "./ui.jsx";

function ShippingForm({ initial, onSaved }) {
  const { toast } = useStore();
  const [form, setForm] = useState({ free_shipping_threshold: initial?.free_shipping_threshold ?? 7000, shipping_fee: initial?.shipping_fee ?? 250, estimated_days: initial?.estimated_days ?? "2 to 4 business days" });
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveSetting("shipping", { ...initial, free_shipping_threshold: Math.round(Number(form.free_shipping_threshold) || 0), shipping_fee: Math.round(Number(form.shipping_fee) || 0), estimated_days: form.estimated_days });
      toast("Delivery settings saved.");
      onSaved();
    } catch (error) {
      toast(error.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Delivery">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
        <Field label="Free delivery over (Rs.)"><Input type="number" min="0" value={form.free_shipping_threshold} onChange={(event) => setForm({ ...form, free_shipping_threshold: event.target.value })} /></Field>
        <Field label="Delivery fee (Rs.)"><Input type="number" min="0" value={form.shipping_fee} onChange={(event) => setForm({ ...form, shipping_fee: event.target.value })} /></Field>
        <Field label="Delivery time shown"><Input value={form.estimated_days} onChange={(event) => setForm({ ...form, estimated_days: event.target.value })} /></Field>
        <div className="sm:col-span-3"><Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? "Saving…" : "Save delivery settings"}</Button></div>
      </form>
    </Card>
  );
}

function PaymentsForm({ initial, onSaved }) {
  const { toast } = useStore();
  /* Card can only be switched on once a payment gateway is configured in the build. */
  const cardReady = Boolean(site.payments.methods.find((method) => method.id === "card")?.enabled);
  const [form, setForm] = useState({ cod_enabled: initial?.cod_enabled ?? true, bank_transfer_enabled: initial?.bank_transfer_enabled ?? true, card_enabled: cardReady && (initial?.card_enabled ?? false) });
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    if (!form.cod_enabled && !form.bank_transfer_enabled && !form.card_enabled) return toast("Keep at least one payment method on.", { type: "error" });
    setBusy(true);
    try {
      await saveSetting("store", { ...initial, ...form });
      toast("Payment methods saved.");
      onSaved();
    } catch (error) {
      toast(error.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Payment methods at checkout">
      <form onSubmit={save} className="grid gap-3">
        <Checkbox label="Cash on delivery" checked={form.cod_enabled} onChange={() => setForm({ ...form, cod_enabled: !form.cod_enabled })} />
        <Checkbox label="Bank transfer (customer sends the receipt on WhatsApp)" checked={form.bank_transfer_enabled} onChange={() => setForm({ ...form, bank_transfer_enabled: !form.bank_transfer_enabled })} />
        <Checkbox
          label={cardReady ? "Debit / credit card" : "Debit / credit card (not available yet: a payment gateway must be connected first)"}
          checked={form.card_enabled}
          disabled={!cardReady}
          onChange={() => setForm({ ...form, card_enabled: !form.card_enabled })}
          className={cardReady ? "" : "!cursor-not-allowed opacity-60"}
        />
        <div><Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? "Saving…" : "Save payment methods"}</Button></div>
      </form>
    </Card>
  );
}

function NotificationsForm({ initial, onSaved }) {
  const { toast } = useStore();
  const [topic, setTopic] = useState(initial?.ntfy_topic || "");
  const [adminUrl, setAdminUrl] = useState(initial?.admin_url || window.location.origin);
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveSetting("notifications", { ...initial, ntfy_topic: topic.trim(), admin_url: adminUrl.trim().replace(/\/+$/, "") });
      toast("Notification topic saved.");
      onSaved();
    } catch (error) {
      toast(error.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Order notifications on your phone">
      <ol className="list-decimal space-y-1 pl-5 text-[14px] text-ink">
        <li>Install the free <strong className="text-navy">ntfy</strong> app (Play Store or App Store).</li>
        <li>In the app choose “Subscribe to topic” and enter the topic below.</li>
        <li>Every new order and contact message then rings your phone.</li>
      </ol>
      <form onSubmit={save} className="mt-4 grid gap-3">
        <Field label="Topic (keep it private)"><Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="naaz-orders-xxxxxxxx" /></Field>
        <Field label="Store address" hint="Tapping a notification opens the order in this admin panel."><Input value={adminUrl} onChange={(event) => setAdminUrl(event.target.value)} placeholder="https://naazandco.com" /></Field>
        <div><Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? "Saving…" : "Save notification settings"}</Button></div>
      </form>
      <p className="mt-2 text-[12px] text-ink-light">Anyone who knows the topic can read the notifications. Change it here if it ever leaks, then subscribe to the new one in the app. Leave it empty to turn notifications off.</p>
    </Card>
  );
}

function Team() {
  const auth = useAuth();
  const { toast } = useStore();
  const team = useAsync(listAdmins, []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function grant(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await grantAdmin(email);
      toast(`${email} is now an admin.`);
      setEmail("");
      team.reload();
    } catch (error) {
      toast(error.message, { type: "error", duration: 6000 });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(member) {
    if (!window.confirm(`Remove admin access for ${member.email}?`)) return;
    try {
      await revokeAdmin(member.user_id);
      team.reload();
    } catch (error) {
      toast(error.message, { type: "error" });
    }
  }

  return (
    <Card title="Team">
      <Async state={team} rows={1}>
        {(rows) => (
          <ul className="divide-y divide-line">
            {rows.map((member) => (
              <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]">
                <span>
                  <span className="block font-semibold text-navy">{member.email}{member.user_id === auth.user?.id && <span className="ml-2 text-[12px] font-normal text-ink-light">(you)</span>}</span>
                  <span className="block text-[12px] text-ink-light">Admin since {formatDate(member.created_at)}</span>
                </span>
                {member.user_id !== auth.user?.id && (
                  <button type="button" onClick={() => revoke(member)} className="h-9 rounded-full px-3 text-[13px] font-semibold text-danger hover:bg-coral-50">
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Async>
      <form onSubmit={grant} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <Field label="Give admin access to" hint="They must first create an account on the store with this email. Only add people you trust." className="min-w-0 flex-1">
          <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
        </Field>
        <Button type="submit" variant="navy" size="sm" className="h-[50px]" disabled={busy}>{busy ? "Adding…" : "Add admin"}</Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const auth = useAuth();
  const { toast } = useStore();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    if (password.length < 8) return toast("Use at least 8 characters.", { type: "error" });
    setBusy(true);
    try {
      await auth.updatePassword(password);
      setPassword("");
      toast("Password changed.");
    } catch (error) {
      toast(error.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Your password">
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <Field label="New password" hint="At least 8 characters." className="min-w-0 flex-1"><Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <Button type="submit" variant="navy" size="sm" className="h-[50px]" disabled={busy || !password}>{busy ? "Saving…" : "Change password"}</Button>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const settings = useAsync(fetchAllSettings, []);
  const { reload } = useCatalog();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (settings.data) setVersion((value) => value + 1);
  }, [settings.data]);
  const saved = () => {
    settings.reload();
    reload();
  };

  return (
    <div className="space-y-5">
      <PageTitle title="Settings" subtitle="Delivery, payments, notifications and who can manage the store." />
      <Async state={settings} rows={3}>
        {(data) => (
          <div key={version} className="grid gap-5 xl:grid-cols-2 xl:items-start">
            <ShippingForm initial={data.shipping} onSaved={saved} />
            <PaymentsForm initial={data.store} onSaved={saved} />
            <NotificationsForm initial={data.notifications} onSaved={saved} />
            <PasswordForm />
            <div className="xl:col-span-2"><Team /></div>
          </div>
        )}
      </Async>
      <p className="text-[13px] text-ink-light">Phone, WhatsApp number, email, address, bank details and social links are part of the site configuration file and are updated by your developer.</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Textarea, Checkbox } from "../components/ui/Form.jsx";
import { InfoIcon } from "../components/ui/Icons.jsx";
import { fetchAllSettings, saveSetting, listAdmins, grantAdmin, revokeAdmin } from "../api/admin.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Card, PageTitle, useAsync } from "./ui.jsx";

const looksPlaceholder = (value) => /0000\s?0000|1234567/.test(String(value || ""));

function Warning({ children }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-coral/40 bg-coral-50 px-3 py-2.5 text-[13px] text-navy">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-coral" /> <span>{children}</span>
    </p>
  );
}

/* Shared save handler: shows a toast, reloads the storefront data and the settings. */
function useSave(onSaved) {
  const { toast } = useStore();
  const [busy, setBusy] = useState(false);
  async function save(key, value, message) {
    setBusy(true);
    try {
      await saveSetting(key, value);
      toast(message);
      onSaved();
    } catch (error) {
      toast(error.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }
  return { busy, save, toast };
}

function ShippingForm({ initial, onSaved }) {
  const { busy, save } = useSave(onSaved);
  const [form, setForm] = useState({ free_shipping_threshold: initial?.free_shipping_threshold ?? 7000, shipping_fee: initial?.shipping_fee ?? 250, estimated_days: initial?.estimated_days ?? "2 to 4 business days" });
  const submit = (event) => {
    event.preventDefault();
    save("shipping", { ...initial, free_shipping_threshold: Math.round(Number(form.free_shipping_threshold) || 0), shipping_fee: Math.round(Number(form.shipping_fee) || 0), estimated_days: form.estimated_days }, "Delivery settings saved.");
  };
  return (
    <Card title="Delivery">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <Field label="Free delivery over (Rs.)"><Input type="number" min="0" value={form.free_shipping_threshold} onChange={(event) => setForm({ ...form, free_shipping_threshold: event.target.value })} /></Field>
        <Field label="Delivery fee (Rs.)"><Input type="number" min="0" value={form.shipping_fee} onChange={(event) => setForm({ ...form, shipping_fee: event.target.value })} /></Field>
        <Field label="Delivery time shown"><Input value={form.estimated_days} onChange={(event) => setForm({ ...form, estimated_days: event.target.value })} /></Field>
        <div className="sm:col-span-3"><Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? "Saving…" : "Save delivery settings"}</Button></div>
      </form>
    </Card>
  );
}

const defaultMethods = [
  { id: "bank", label: "Bank Transfer", enabled: true, bank: "", account_title: "", account_number: "" },
  { id: "easypaisa", label: "Easypaisa", enabled: false, bank: "", account_title: "", account_number: "" },
  { id: "jazzcash", label: "JazzCash", enabled: false, bank: "", account_title: "", account_number: "" },
];

function PaymentsForm({ initial, onSaved }) {
  const { busy, save, toast } = useSave(onSaved);
  const [percent, setPercent] = useState(initial?.advance_percent ?? 50);
  const [methods, setMethods] = useState(() => defaultMethods.map((method) => ({ ...method, ...(initial?.methods || []).find((entry) => entry.id === method.id) })));
  const setMethod = (id, patch) => setMethods(methods.map((method) => (method.id === id ? { ...method, ...patch } : method)));
  const value = Math.min(100, Math.max(1, Math.round(Number(percent) || 0)));
  const usable = methods.filter((method) => method.enabled && method.account_number.trim());
  const example = 10000;

  function submit(event) {
    event.preventDefault();
    if (!(Number(percent) >= 1 && Number(percent) <= 100)) return toast("The advance must be between 1 and 100 percent.", { type: "error" });
    const missing = methods.find((method) => method.enabled && !method.account_number.trim());
    if (missing) return toast(`Add the account number for ${missing.label}, or switch it off.`, { type: "error" });
    if (!usable.length) return toast("Keep at least one payment method on, otherwise customers cannot check out.", { type: "error" });
    save("payments", { ...initial, advance_percent: value, methods: methods.map((method) => ({ ...method, bank: method.bank.trim(), account_title: method.account_title.trim(), account_number: method.account_number.trim() })) }, "Payment settings saved.");
  }

  return (
    <Card title="Payment: advance and accounts">
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-end">
          <Field label="Advance to confirm an order (%)" hint="100 = full payment in advance.">
            <Input type="number" min="1" max="100" value={percent} onChange={(event) => setPercent(event.target.value)} />
          </Field>
          <p className="rounded-xl bg-tint px-4 py-3 text-[13px] text-navy">
            On a {formatPrice(example)} order the customer pays <strong>{formatPrice(Math.ceil((example * value) / 100))}</strong> now and <strong>{formatPrice(example - Math.ceil((example * value) / 100))}</strong> on delivery. There is no cash on delivery for the full amount.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-[13px] font-semibold text-ink-mid">Where customers send the advance</p>
          {methods.map((method) => (
            <div key={method.id} className={`rounded-2xl border p-4 ${method.enabled ? "border-line" : "border-dashed border-line bg-tint/60"}`}>
              <Checkbox label={<span className="font-semibold">{method.label}</span>} checked={method.enabled} onChange={() => setMethod(method.id, { enabled: !method.enabled })} />
              {method.enabled && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {method.id === "bank" && <Field label="Bank name"><Input value={method.bank} onChange={(event) => setMethod(method.id, { bank: event.target.value })} placeholder="e.g. Meezan Bank" /></Field>}
                  <Field label="Account title"><Input value={method.account_title} onChange={(event) => setMethod(method.id, { account_title: event.target.value })} placeholder="Name on the account" /></Field>
                  <Field label={method.id === "bank" ? "Account number / IBAN" : "Mobile account number"} className={method.id === "bank" ? "" : "sm:col-span-2"}>
                    <Input value={method.account_number} onChange={(event) => setMethod(method.id, { account_number: event.target.value })} placeholder={method.id === "bank" ? "PK.." : "03XX XXXXXXX"} />
                  </Field>
                  {looksPlaceholder(method.account_number) && <div className="sm:col-span-3"><Warning>This looks like the sample account. Replace it with your real account before taking orders, or customers will not be able to pay you.</Warning></div>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div><Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? "Saving…" : "Save payment settings"}</Button></div>
      </form>
    </Card>
  );
}

const contactFields = [
  ["phone", "Phone number", "+92 3XX XXXXXXX"],
  ["whatsapp", "WhatsApp number", "923XXXXXXXXX (country code, no +)"],
  ["email", "Email", "you@yourdomain.com"],
  ["hours", "Opening hours", "Mon to Sat, 10am to 8pm"],
  ["instagram", "Instagram link", "https://instagram.com/yourpage"],
  ["facebook", "Facebook link", "https://facebook.com/yourpage"],
  ["tiktok", "TikTok link", "https://tiktok.com/@yourpage"],
  ["youtube", "YouTube link", "https://youtube.com/@yourchannel"],
];

function StoreDetailsForm({ initial, onSaved }) {
  const { busy, save } = useSave(onSaved);
  const [form, setForm] = useState({ phone: "", whatsapp: "", email: "", hours: "", address: "", instagram: "", facebook: "", tiktok: "", youtube: "", announcement: "", ...initial });
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const submit = (event) => {
    event.preventDefault();
    save("contact", Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value ?? "").trim()])), "Store details saved. The site updates straight away.");
  };
  return (
    <Card title="Store details shown on the site">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {(looksPlaceholder(form.phone) || looksPlaceholder(form.whatsapp)) && (
          <div className="sm:col-span-2"><Warning>The phone and WhatsApp numbers are still the sample ones. Put your own numbers in before sharing the site, otherwise customer messages go to someone else.</Warning></div>
        )}
        {contactFields.map(([field, label, placeholder]) => (
          <Field key={field} label={label}><Input value={form[field]} onChange={set(field)} placeholder={placeholder} /></Field>
        ))}
        <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={set("address")} /></Field>
        <Field label="Announcement bar" hint="Leave empty to show the delivery and advance terms automatically." className="sm:col-span-2">
          <Textarea rows={2} value={form.announcement} onChange={set("announcement")} placeholder="e.g. Eid sale: 15% off everything until Sunday." />
        </Field>
        <p className="text-[12px] text-ink-light sm:col-span-2">Empty fields are hidden on the site. Social icons appear in the footer only when a link is filled in.</p>
        <div className="sm:col-span-2"><Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? "Saving…" : "Save store details"}</Button></div>
      </form>
    </Card>
  );
}

function NotificationsForm({ initial, onSaved }) {
  const { busy, save } = useSave(onSaved);
  const [topic, setTopic] = useState(initial?.ntfy_topic || "");
  const [adminUrl, setAdminUrl] = useState(initial?.admin_url || window.location.origin);
  const submit = (event) => {
    event.preventDefault();
    save("notifications", { ...initial, ntfy_topic: topic.trim(), admin_url: adminUrl.trim().replace(/\/+$/, "") }, "Notification settings saved.");
  };
  return (
    <Card title="Order notifications on your phone">
      <ol className="list-decimal space-y-1 pl-5 text-[14px] text-ink">
        <li>Install the free <strong className="text-navy">ntfy</strong> app (Play Store or App Store).</li>
        <li>In the app choose “Subscribe to topic” and enter the topic below.</li>
        <li>Every new order and contact message then rings your phone.</li>
      </ol>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <Field label="Topic (keep it private)"><Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="naz-orders-xxxxxxxx" /></Field>
        <Field label="Store address" hint="Tapping a notification opens the order in this admin panel."><Input value={adminUrl} onChange={(event) => setAdminUrl(event.target.value)} placeholder="https://your-site.netlify.app" /></Field>
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
      <PageTitle title="Settings" subtitle="Payment, delivery, store details, notifications and who can manage the store. Changes show on the site straight away." />
      <Async state={settings} rows={3}>
        {(data) => (
          <div key={version} className="grid gap-5 xl:grid-cols-2 xl:items-start">
            <div className="xl:col-span-2"><PaymentsForm initial={data.payments} onSaved={saved} /></div>
            <div className="xl:col-span-2"><StoreDetailsForm initial={data.contact} onSaved={saved} /></div>
            <ShippingForm initial={data.shipping} onSaved={saved} />
            <NotificationsForm initial={data.notifications} onSaved={saved} />
            <PasswordForm />
            <Team />
          </div>
        )}
      </Async>
    </div>
  );
}

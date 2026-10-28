import { useState } from "react";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Textarea, Checkbox } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { InfoIcon } from "../components/ui/Icons.jsx";
import { fetchAllSettings, saveSetting, listAdmins, grantAdmin, revokeAdmin, sendTestNotification } from "../api/admin.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Card, PageTitle, useAsync } from "./ui.jsx";
import { toInternational } from "./helpers.js";

const looksPlaceholder = (value) => /0000\s?0000|1234567|DEMO/i.test(String(value || ""));
const isLocalAddress = (value) => !value || /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
const text = (value) => String(value ?? "");

function Warning({ children }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-coral/40 bg-coral-50 px-3 py-2.5 text-[13px] text-navy">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-coral" /> <span>{children}</span>
    </p>
  );
}

function OwnerOnly() {
  return <p className="mb-4 rounded-xl bg-tint px-4 py-3 text-[13px] font-semibold text-navy">Only the store owner can change this.</p>;
}

/* Shared save handler: shows a toast and hands the saved value back so only this card refreshes. */
function useSave(key, onSaved) {
  const { toast } = useStore();
  const [busy, setBusy] = useState(false);
  async function save(value, message) {
    setBusy(true);
    try {
      await saveSetting(key, value);
      toast(message);
      onSaved(key, value);
    } catch (error) {
      toast(error.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }
  return { busy, save, toast };
}

function ShippingForm({ initial, onSaved }) {
  const { busy, save } = useSave("shipping", onSaved);
  const [form, setForm] = useState({ free_shipping_threshold: initial?.free_shipping_threshold ?? 7000, shipping_fee: initial?.shipping_fee ?? 250, estimated_days: initial?.estimated_days ?? "2 to 4 business days" });
  const submit = (event) => {
    event.preventDefault();
    save({ ...initial, free_shipping_threshold: Math.round(Number(form.free_shipping_threshold) || 0), shipping_fee: Math.round(Number(form.shipping_fee) || 0), estimated_days: form.estimated_days.trim() }, "Delivery settings saved.");
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
  { id: "nayapay", label: "NayaPay", enabled: false, bank: "", account_title: "", account_number: "" },
  { id: "sadapay", label: "SadaPay", enabled: false, bank: "", account_title: "", account_number: "" },
];

/* Saved methods merged over the defaults; methods the form doesn't know are kept as they are. */
function initialMethods(saved = []) {
  const clean = (method) => ({ ...method, bank: text(method.bank), account_title: text(method.account_title), account_number: text(method.account_number) });
  const known = defaultMethods.map((method) => clean({ ...method, ...saved.find((entry) => entry.id === method.id) }));
  const extra = saved.filter((entry) => entry?.id && !defaultMethods.some((method) => method.id === entry.id)).map((entry) => clean({ label: entry.id, enabled: false, ...entry }));
  return [...known, ...extra];
}

function PaymentsForm({ initial, onSaved, locked }) {
  const { busy, save, toast } = useSave("payments", onSaved);
  const [percent, setPercent] = useState(initial?.advance_percent ?? 50);
  const [holdHours, setHoldHours] = useState(initial?.hold_hours ?? 48);
  const [methods, setMethods] = useState(() => initialMethods(initial?.methods || []));
  const setMethod = (id, patch) => setMethods(methods.map((method) => (method.id === id ? { ...method, ...patch } : method)));
  const value = Math.min(100, Math.max(1, Math.round(Number(percent) || 0)));
  const usable = methods.filter((method) => method.enabled && method.account_number.trim());
  const example = 10000;

  function submit(event) {
    event.preventDefault();
    if (!(Number(percent) >= 1 && Number(percent) <= 100)) return toast("The advance must be between 1 and 100 percent.", { type: "error" });
    const hours = Math.round(Number(holdHours));
    if (!(hours >= 12 && hours <= 168)) return toast("Unpaid orders can wait between 12 and 168 hours (7 days).", { type: "error" });
    const missing = methods.find((method) => method.enabled && !method.account_number.trim());
    if (missing) return toast(`Add the account number for ${missing.label}, or switch it off.`, { type: "error" });
    if (!usable.length) return toast("Keep at least one payment method on, otherwise customers cannot check out.", { type: "error" });
    save({ ...initial, advance_percent: value, hold_hours: hours, methods: methods.map((method) => ({ ...method, bank: method.bank.trim(), account_title: method.account_title.trim(), account_number: method.account_number.trim() })) }, "Payment settings saved.");
  }

  return (
    <Card title="Payment: advance and accounts">
      {locked && <OwnerOnly />}
      <form onSubmit={submit}>
        <fieldset disabled={locked} className="grid gap-5 disabled:opacity-80">
          <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-end">
            <Field label="Advance to confirm an order (%)" hint="100 = full payment in advance.">
              <Input type="number" min="1" max="100" value={percent} onChange={(event) => setPercent(event.target.value)} />
            </Field>
            <p className="rounded-xl bg-tint px-4 py-3 text-[13px] text-navy">
              On a {formatPrice(example)} order the customer pays <strong>{formatPrice(Math.ceil((example * value) / 100))}</strong> now and <strong>{formatPrice(example - Math.ceil((example * value) / 100))}</strong> on delivery. There is no cash on delivery for the full amount.
            </p>
            <Field label="Unpaid orders auto-cancel after (hours)" hint="12 to 168. The stock goes back on sale.">
              <Input type="number" min="12" max="168" value={holdHours} onChange={(event) => setHoldHours(event.target.value)} />
            </Field>
            <p className="px-1 text-[13px] text-ink">An order whose advance has not been recorded within this time is cancelled automatically, and the customer sees that on the tracking page.</p>
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
                    {looksPlaceholder(method.account_number) && <div className="sm:col-span-3"><Warning>This looks like the sample account. Replace it with your real account: checkout stays closed for this method until you do.</Warning></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
          {!locked && <div><Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? "Saving…" : "Save payment settings"}</Button></div>}
        </fieldset>
      </form>
    </Card>
  );
}

const contactFields = [
  ["phone", "Phone number", "+92 3XX XXXXXXX"],
  ["whatsapp", "WhatsApp number", "03XX XXXXXXX or 923XXXXXXXXX"],
  ["email", "Email", "you@yourdomain.com"],
  ["hours", "Opening hours", "Mon to Sat, 10am to 8pm"],
  ["instagram", "Instagram link", "https://instagram.com/yourpage"],
  ["facebook", "Facebook link", "https://facebook.com/yourpage"],
  ["tiktok", "TikTok link", "https://tiktok.com/@yourpage"],
  ["youtube", "YouTube link", "https://youtube.com/@yourchannel"],
];

function StoreDetailsForm({ initial, onSaved }) {
  const { busy, save } = useSave("contact", onSaved);
  const [form, setForm] = useState(() => {
    const start = { phone: "", whatsapp: "", email: "", hours: "", address: "", instagram: "", facebook: "", tiktok: "", youtube: "", announcement: "", ...initial };
    return Object.fromEntries(Object.entries(start).map(([key, value]) => [key, text(value)]));
  });
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const submit = (event) => {
    event.preventDefault();
    const value = Object.fromEntries(Object.entries(form).map(([key, entry]) => [key, text(entry).trim()]));
    /* wa.me links need the international form, so 03xx is saved as 923xx. */
    value.whatsapp = toInternational(value.whatsapp);
    save(value, "Store details saved. The site updates straight away.");
  };
  const missing = [!form.phone.trim() && "phone number", !form.whatsapp.trim() && "WhatsApp number"].filter(Boolean);
  return (
    <Card title="Store details shown on the site">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {(looksPlaceholder(form.phone) || looksPlaceholder(form.whatsapp)) && (
          <div className="sm:col-span-2"><Warning>The phone and WhatsApp numbers are still the sample ones. Put your own numbers in before sharing the site, otherwise customer messages go to someone else.</Warning></div>
        )}
        {missing.length > 0 && (
          <div className="sm:col-span-2"><Warning>No {missing.join(" or ")} yet: customers won’t see a {missing.length === 2 ? "phone number or WhatsApp button" : missing[0] === "phone number" ? "phone number" : "WhatsApp button"} until you add {missing.length === 2 ? "them" : "it"}.</Warning></div>
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

/* A long random topic: hard to guess, so strangers can't read the notifications. */
function randomTopic() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `naz-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

function NotificationsForm({ initial, onSaved, locked }) {
  const { busy, save, toast } = useSave("notifications", onSaved);
  const savedTopic = text(initial?.ntfy_topic).trim();
  const savedUrl = text(initial?.admin_url).trim();
  const here = window.location.origin;
  const [topic, setTopic] = useState(savedTopic);
  /* A saved address that only works on a laptop (or none at all) is replaced with this site's address, ready to save. */
  const [adminUrl, setAdminUrl] = useState(isLocalAddress(savedUrl) && !isLocalAddress(here) ? here : savedUrl || here);
  const [testing, setTesting] = useState(false);
  /* The test goes to the saved topic, so only an unsaved topic change blocks it. */
  const unsaved = topic.trim() !== savedTopic;

  const submit = (event) => {
    event.preventDefault();
    const value = topic.trim();
    if (value && value.length < 12) return toast("Use a longer topic (12 characters or more) so nobody can guess it. Try “Generate”.", { type: "error" });
    save({ ...initial, ntfy_topic: value, admin_url: adminUrl.trim().replace(/\/+$/, "") }, "Notification settings saved.");
  };

  async function test() {
    if (unsaved) return toast("Save the new topic first, then send a test.", { type: "error" });
    setTesting(true);
    try {
      const result = await sendTestNotification();
      if (result?.sent) toast("Test sent. Your phone should ring within a few seconds.");
      else toast(result?.reason === "no-topic" ? "Add a topic and save it first." : "The test could not be sent.", { type: "error" });
    } catch (error) {
      toast(error.message, { type: "error" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card title="Order notifications on your phone">
      {locked && <OwnerOnly />}
      <ol className="list-decimal space-y-1 pl-5 text-[14px] text-ink">
        <li>Install the free <strong className="text-navy">ntfy</strong> app (Play Store or App Store).</li>
        <li>In the app choose “Subscribe to topic” and enter the topic below.</li>
        <li>Every new order and contact message then rings your phone. Customer names, phone numbers and addresses are not sent; tap the notification to see them here.</li>
      </ol>
      <form onSubmit={submit} className="mt-4">
        <fieldset disabled={locked} className="grid gap-3 disabled:opacity-80">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Topic (keep it private)" className="min-w-0 flex-1"><Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="naz-xxxxxxxxxxxxxxxxxxxxxxxx" /></Field>
            {!locked && (
              <button type="button" onClick={() => setTopic(randomTopic())} className="h-[50px] shrink-0 rounded-xl border border-line px-4 text-[14px] font-semibold text-navy hover:border-navy">
                Generate
              </button>
            )}
          </div>
          <Field label="Store address" hint="Tapping a notification opens the order in this admin panel."><Input value={adminUrl} onChange={(event) => setAdminUrl(event.target.value)} placeholder="https://your-site.netlify.app" /></Field>
          {isLocalAddress(adminUrl.trim()) && <Warning>This address only works on your computer. Put your live site address here, e.g. https://your-site.netlify.app, so notifications open on your phone.</Warning>}
          {!isLocalAddress(adminUrl.trim()) && adminUrl.trim().replace(/\/+$/, "") !== savedUrl && <p className="text-[12px] text-ink-light">Filled in with this site’s address. Save to use it.</p>}
          {!locked && <div><Button type="submit" variant="navy" size="sm" disabled={busy}>{busy ? "Saving…" : "Save notification settings"}</Button></div>}
        </fieldset>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={test} disabled={testing || !savedTopic}>{testing ? "Sending…" : "Send test notification"}</Button>
        {!savedTopic && <span className="text-[12px] text-ink-light">Save a topic to send a test.</span>}
      </div>
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
  const owner = auth.isOwner;

  async function grant(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await grantAdmin(email);
      toast(`${email.trim()} is now an admin.`);
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
      await revokeAdmin({ userId: member.user_id, email: member.email });
      toast(`${member.email} no longer has admin access.`);
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
            {rows.map((member) => {
              const you = member.user_id && member.user_id === auth.user?.id;
              const isOwnerRow = member.role === "owner";
              return (
                <li key={member.user_id || member.email} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-navy">
                      <span className="truncate">{member.email}</span>
                      <Badge tone={isOwnerRow ? "navy" : "muted"}>{isOwnerRow ? "Owner" : "Staff"}</Badge>
                      {you && <span className="text-[12px] font-normal text-ink-light">(you)</span>}
                      {!member.user_id && <span className="text-[12px] font-normal text-coral">no account linked</span>}
                    </span>
                    <span className="block text-[12px] text-ink-light">
                      Admin since {formatDate(member.created_at)} · {member.last_sign_in_at ? `last signed in ${formatDate(member.last_sign_in_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "never signed in"}
                    </span>
                  </span>
                  {owner && !you && !isOwnerRow && (
                    <button type="button" onClick={() => revoke(member)} className="h-9 rounded-full px-3 text-[13px] font-semibold text-danger hover:bg-coral-50">
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Async>
      {owner ? (
        <form onSubmit={grant} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <Field label="Give admin access to" hint="They must first create an account on the store with this email. Staff can run orders and products but cannot change payment accounts, notifications or the team." className="min-w-0 flex-1">
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
          </Field>
          <Button type="submit" variant="navy" size="sm" className="h-[50px]" disabled={busy}>{busy ? "Adding…" : "Add admin"}</Button>
        </form>
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink">Only the store owner can add or remove admins.</p>
      )}
    </Card>
  );
}

function PasswordForm() {
  const auth = useAuth();
  const { toast } = useStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    if (password.length < 8) return toast("Use at least 8 characters.", { type: "error" });
    if (password !== confirm) return toast("The two passwords don’t match.", { type: "error" });
    setBusy(true);
    try {
      await auth.updatePassword(password);
      setPassword("");
      setConfirm("");
      toast("Password changed.");
    } catch (error) {
      toast(error.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Your password">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <Field label="New password" hint="At least 8 characters."><Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <Field label="Repeat the new password" hint="Type it again to check."><Input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></Field>
        <div className="sm:col-span-2"><Button type="submit" variant="navy" size="sm" disabled={busy || !password || !confirm}>{busy ? "Saving…" : "Change password"}</Button></div>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const auth = useAuth();
  const settings = useAsync(fetchAllSettings, []);
  const { reload } = useCatalog();
  /* Per card: the value just saved and a counter, so only that card refreshes and unsaved edits elsewhere survive. */
  const [saved, setSaved] = useState({});
  const onSaved = (key, value) => {
    setSaved((current) => ({ ...current, [key]: { value, version: (current[key]?.version || 0) + 1 } }));
    reload();
  };
  const locked = !auth.isOwner;

  return (
    <div className="space-y-5">
      <PageTitle title="Settings" subtitle="Payment, delivery, store details, notifications and who can manage the store. Changes show on the site straight away." />
      <Async state={settings} rows={3}>
        {(data) => {
          const version = (key) => `${key}-${saved[key]?.version || 0}`;
          const initial = (key) => saved[key]?.value ?? data[key];
          return (
            <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
              <div className="xl:col-span-2"><PaymentsForm key={version("payments")} initial={initial("payments")} onSaved={onSaved} locked={locked} /></div>
              <div className="xl:col-span-2"><StoreDetailsForm key={version("contact")} initial={initial("contact")} onSaved={onSaved} /></div>
              <ShippingForm key={version("shipping")} initial={initial("shipping")} onSaved={onSaved} />
              <NotificationsForm key={version("notifications")} initial={initial("notifications")} onSaved={onSaved} locked={locked} />
              <PasswordForm />
              <Team />
            </div>
          );
        }}
      </Async>
    </div>
  );
}

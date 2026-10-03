import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { EmptyState, Skeleton } from "../components/ui/Feedback.jsx";
import { PackageIcon, HeartIcon, UserIcon, ShieldIcon, CheckIcon } from "../components/ui/Icons.jsx";
import { PageHeader } from "../components/sections/Sections.jsx";
import { getMyOrders } from "../api/orders.js";
import { hydrateOrder } from "../lib/cart.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { orderStatuses, terminalStatuses, cities } from "../data/misc.js";
import { site } from "../config/site.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";

const phonePattern = /^(\+92|0)?3\d{9}$/;

function statusTone(status) {
  if (status === "delivered") return "success";
  if (terminalStatuses[status]) return "danger";
  return "teal";
}
function statusLabel(status) {
  return orderStatuses.find((entry) => entry.id === status)?.label || terminalStatuses[status] || status;
}

/* ------------------------------------------------------------ sign in / up */
function AuthForms() {
  const auth = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode === "signup") {
      if (form.name.trim().length < 3) return setError("Please enter your full name.");
      if (!phonePattern.test(form.phone.replace(/[\s-]/g, ""))) return setError("Enter a valid Pakistani mobile number, e.g. 0300 1234567.");
      if (form.password.length < 8) return setError("Your password needs at least 8 characters.");
    }
    setBusy(true);
    try {
      if (mode === "signin") await auth.signIn(form.email, form.password);
      else if (mode === "signup") {
        const result = await auth.signUp(form);
        if (result.needsConfirmation) setNotice("Almost done. We sent a confirmation link to your email; open it to finish creating your account.");
      } else {
        await auth.resetPassword(form.email);
        setNotice("If an account exists for that email, a reset link is on its way.");
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  const titles = { signin: "Sign in", signup: "Create your account", reset: "Reset your password" };

  return (
    <div className="mx-auto max-w-md">
      {mode !== "reset" && (
        <div className="mb-4 grid grid-cols-2 rounded-full bg-tint p-1" role="tablist">
          {[
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); setError(""); setNotice(""); }} className={`h-11 rounded-full text-[14px] font-semibold transition-colors ${mode === id ? "bg-white text-navy shadow-card" : "text-ink hover:text-navy"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8">
        <h2 className="font-display text-[22px] font-extrabold text-navy">{titles[mode]}</h2>
        <p className="mt-1 text-[14px] text-ink">
          {mode === "signin" && "See your orders, track deliveries and check out faster."}
          {mode === "signup" && "Save your address once and keep every order in one place."}
          {mode === "reset" && "Enter your email and we will send you a link to choose a new password."}
        </p>

        <div className="mt-5 grid gap-4">
          {mode === "signup" && (
            <>
              <Field label="Full name" required>
                <Input required value={form.name} onChange={update("name")} autoComplete="name" />
              </Field>
              <Field label="Mobile number" required hint="Used for order updates on WhatsApp.">
                <Input required type="tel" inputMode="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" placeholder="0300 1234567" />
              </Field>
            </>
          )}
          <Field label="Email" required>
            <Input required type="email" inputMode="email" value={form.email} onChange={update("email")} autoComplete="email" />
          </Field>
          {mode !== "reset" && (
            <Field label="Password" required hint={mode === "signup" ? "At least 8 characters." : undefined}>
              <Input required type="password" value={form.password} onChange={update("password")} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} />
            </Field>
          )}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl bg-mint/40 px-4 py-3 text-[14px] text-navy">{notice}</p>}

        <Button type="submit" variant="navy" className="mt-6 w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>

        <p className="mt-4 text-center text-[13px] text-ink">
          {mode === "signin" && (
            <button type="button" onClick={() => setMode("reset")} className="font-semibold text-teal hover:underline">
              Forgot your password?
            </button>
          )}
          {mode === "reset" && (
            <button type="button" onClick={() => setMode("signin")} className="font-semibold text-teal hover:underline">
              Back to sign in
            </button>
          )}
          {mode === "signup" && (
            <>
              By creating an account you agree to our <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy-policy" className="underline">privacy policy</Link>.
            </>
          )}
        </p>
      </form>

      <p className="mt-5 text-center text-[14px] text-ink">
        Ordered as a guest? <Link to="/track-order" className="font-semibold text-teal hover:underline">Track your order</Link> with the order number and phone.
      </p>
    </div>
  );
}

/* ------------------------------------------------------- new password form */
function NewPasswordForm() {
  const auth = useAuth();
  const { toast } = useStore();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return setError("Your password needs at least 8 characters.");
    setBusy(true);
    try {
      await auth.updatePassword(password);
      toast("Password updated.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8">
      <h2 className="font-display text-[22px] font-extrabold text-navy">Choose a new password</h2>
      <Field label="New password" required hint="At least 8 characters." className="mt-5" error={error}>
        <Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} />
      </Field>
      <Button type="submit" variant="navy" className="mt-6 w-full" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------ profile form */
function ProfileForm() {
  const auth = useAuth();
  const { toast } = useStore();
  const [form, setForm] = useState({ name: auth.profile?.name || "", phone: auth.profile?.phone || "", address: auth.profile?.address || "", city: auth.profile?.city || "Karachi", province: auth.profile?.province || "Sindh" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function save(event) {
    event.preventDefault();
    setError("");
    if (form.phone && !phonePattern.test(form.phone.replace(/[\s-]/g, ""))) return setError("Enter a valid Pakistani mobile number.");
    setBusy(true);
    try {
      await auth.updateProfile({ ...form, phone: form.phone.replace(/[\s-]/g, "") });
      if (password) {
        if (password.length < 8) throw new Error("Your new password needs at least 8 characters.");
        await auth.updatePassword(password);
        setPassword("");
      }
      toast("Your details are saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-display text-[20px] font-extrabold text-navy">Your details</h2>
      <p className="mt-1 text-[14px] text-ink">Used to fill in checkout for you. Signed in as {auth.user.email}.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={form.name} onChange={update("name")} autoComplete="name" /></Field>
        <Field label="Mobile number"><Input type="tel" inputMode="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" placeholder="0300 1234567" /></Field>
        <Field label="Street address" className="sm:col-span-2"><Input value={form.address} onChange={update("address")} autoComplete="street-address" placeholder="House, street, area" /></Field>
        <Field label="City">
          <Select value={form.city} onChange={update("city")}>{cities.map((city) => <option key={city}>{city}</option>)}</Select>
        </Field>
        <Field label="Province">
          <Select value={form.province} onChange={update("province")}>{site.shipping.provinces.map((province) => <option key={province}>{province}</option>)}</Select>
        </Field>
        <Field label="New password (optional)" hint="Leave empty to keep your current password." className="sm:col-span-2">
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
        </Field>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">{error}</p>}
      <Button type="submit" variant="navy" className="mt-6" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------- orders tab */
function OrdersList() {
  const { productById, productBySlug } = useCatalog();
  const auth = useAuth();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyOrders()
      .then((list) => !cancelled && setOrders(list.map((order) => hydrateOrder(order, { productById, productBySlug }))))
      .catch(() => !cancelled && setOrders([]));
    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, productById, productBySlug]);

  if (orders === null) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (!orders.length) {
    return <EmptyState icon={PackageIcon} title="No orders yet" text="Orders you place while signed in appear here automatically." action={{ label: "Start shopping", to: "/shop" }} secondary={{ label: "Track a guest order", to: "/track-order" }} />;
  }
  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li key={order.id} className="rounded-2xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-[16px] font-extrabold text-navy">{order.id}</p>
              <p className="text-[13px] text-ink-light">{formatDate(order.placedAt)} · {order.lines.length} item{order.lines.length === 1 ? "" : "s"} · {formatPrice(order.totals.total)}</p>
            </div>
            <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
          </div>
          <p className="mt-3 text-[14px] text-ink">{order.lines.map((line) => `${line.quantity} × ${line.product?.name || line.name}`).join(", ")}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-[14px] font-semibold">
            <Link to={`/order/${order.id}`} state={{ order }} className="text-teal hover:underline">View order</Link>
            {order.trackingCode && <span className="text-ink">Tracking: <span className="font-mono text-[13px] text-navy">{order.trackingCode}</span></span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------- page */
export default function AccountPage() {
  useSeo({ title: "My Account", path: "/account", noindex: true });
  const auth = useAuth();
  const { wishlist } = useStore();
  const [tab, setTab] = useState("orders");

  if (!auth.available) {
    return (
      <>
        <PageHeader title="My account" />
        <section className="wrap py-10">
          <EmptyState icon={UserIcon} title="Accounts are available on the live store" text="This preview runs on demo data. You can still track any order with its order number and phone." action={{ label: "Track an order", to: "/track-order" }} />
        </section>
      </>
    );
  }

  if (auth.loading) {
    return (
      <section className="wrap py-16" aria-busy="true">
        <Skeleton className="mx-auto h-80 max-w-md" />
      </section>
    );
  }

  if (auth.recovery && auth.session) {
    return (
      <>
        <PageHeader title="Reset password" />
        <section className="wrap py-8 sm:py-10"><NewPasswordForm /></section>
      </>
    );
  }

  if (!auth.session) {
    return (
      <>
        <PageHeader title="My account" description="Sign in to see your orders and check out faster, or create an account in under a minute." />
        <section className="wrap py-8 sm:py-10"><AuthForms /></section>
      </>
    );
  }

  const name = auth.profile?.name || auth.user.user_metadata?.name || "there";
  const tabs = [
    { id: "orders", label: "Orders", Icon: PackageIcon },
    { id: "profile", label: "Details & password", Icon: UserIcon },
  ];

  return (
    <>
      <PageHeader title={`Hello, ${name.split(" ")[0]}`} description="Your orders, details and saved items.">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="success" className="gap-1"><CheckIcon className="size-3" /> Signed in</Badge>
          <button type="button" onClick={() => auth.signOut()} className="text-[13px] font-semibold text-teal hover:underline">
            Sign out
          </button>
        </div>
      </PageHeader>
      <section className="wrap grid gap-8 py-8 sm:py-10 lg:grid-cols-[240px_1fr] lg:items-start">
        <nav className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold ${tab === id ? "bg-navy text-white" : "bg-tint text-navy hover:bg-line"}`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
          <Link to="/wishlist" className="flex shrink-0 items-center gap-2 rounded-full bg-tint px-4 py-2.5 text-[14px] font-semibold text-navy hover:bg-line">
            <HeartIcon className="size-4" /> Wishlist ({wishlist.length})
          </Link>
          {auth.isAdmin && (
            <Link to="/admin" className="flex shrink-0 items-center gap-2 rounded-full bg-coral px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-coral-600">
              <ShieldIcon className="size-4" /> Admin dashboard
            </Link>
          )}
        </nav>
        <div>{tab === "orders" ? <OrdersList /> : <ProfileForm />}</div>
      </section>
    </>
  );
}

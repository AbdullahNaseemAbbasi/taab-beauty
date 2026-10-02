import { useState } from "react";
import { Link } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Field, Input } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { PackageIcon, HeartIcon, PinIcon, UserIcon } from "../components/ui/Icons.jsx";
import { PageHeader } from "../components/sections/Sections.jsx";
import { allLocalOrders } from "../lib/cart.js";
import { formatDate, formatPrice } from "../lib/format.js";
import { orderStatuses, terminalStatuses } from "../data/misc.js";
import { useStore } from "../store/StoreProvider.jsx";

const ACCOUNT_KEY = "taab:account";

function loadAccount() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
  } catch {
    return null;
  }
}

function statusTone(status) {
  if (status === "delivered") return "success";
  if (terminalStatuses[status]) return "danger";
  return "teal";
}

function statusLabel(status) {
  return orderStatuses.find((entry) => entry.id === status)?.label || terminalStatuses[status] || status;
}

export default function AccountPage() {
  useSeo({ title: "My Account", path: "/account", noindex: true });
  const { wishlist } = useStore();
  const [account, setAccount] = useState(loadAccount);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [tab, setTab] = useState("orders");

  function signIn(event) {
    event.preventDefault();
    const next = { ...form, since: new Date().toISOString() };
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
    setAccount(next);
  }

  function signOut() {
    localStorage.removeItem(ACCOUNT_KEY);
    setAccount(null);
  }

  if (!account) {
    return (
      <>
        <PageHeader title="My account" description="Save addresses, see your orders and keep your wishlist across devices." />
        <section className="wrap py-10">
          <form onSubmit={signIn} className="mx-auto max-w-md rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="font-display text-[22px] font-extrabold text-navy">Sign in or create an account</h2>
            <p className="mt-1 text-[14px] text-ink">Demo mode: enter any details to see the account area. Real sign-in with OTP is wired up when the backend goes live.</p>
            <div className="mt-5 grid gap-4">
              <Field label="Full name" required>
                <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" />
              </Field>
              <Field label="Mobile number" required>
                <Input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" placeholder="0300 1234567" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" />
              </Field>
            </div>
            <Button type="submit" variant="navy" className="mt-6 w-full">
              Continue
            </Button>
          </form>
        </section>
      </>
    );
  }

  const orders = allLocalOrders();
  const addresses = Array.from(new Map(orders.filter((order) => order.customer?.address).map((order) => [order.customer.address, order.customer])).values());
  const tabs = [
    { id: "orders", label: "Orders", Icon: PackageIcon },
    { id: "addresses", label: "Addresses", Icon: PinIcon },
    { id: "profile", label: "Profile", Icon: UserIcon },
  ];

  return (
    <>
      <PageHeader title={`Hello, ${account.name.split(" ")[0]}`} description="Manage your orders, addresses and details.">
        <button type="button" onClick={signOut} className="mt-3 text-[13px] font-semibold text-teal hover:underline">
          Sign out
        </button>
      </PageHeader>
      <section className="wrap grid gap-8 py-10 lg:grid-cols-[240px_1fr] lg:items-start">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold ${tab === id ? "bg-navy text-white" : "bg-tint text-navy hover:bg-line"}`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
          <Link to="/wishlist" className="flex shrink-0 items-center gap-2 rounded-full bg-tint px-4 py-2.5 text-[14px] font-semibold text-navy hover:bg-line">
            <HeartIcon className="size-4" /> Wishlist ({wishlist.length})
          </Link>
        </nav>

        <div>
          {tab === "orders" &&
            (orders.length ? (
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
                    <p className="mt-3 text-[14px] text-ink">{order.lines.map((line) => `${line.quantity} × ${line.product?.name}`).join(", ")}</p>
                    <Link to={`/order/${order.id}`} className="mt-3 inline-block text-[14px] font-semibold text-teal hover:underline">
                      View order
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={PackageIcon} title="No orders yet" text="Your orders will appear here after checkout." action={{ label: "Start shopping", to: "/shop" }} />
            ))}

          {tab === "addresses" &&
            (addresses.length ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {addresses.map((address) => (
                  <li key={address.address} className="rounded-2xl border border-line bg-white p-5 text-[14px] text-ink">
                    <p className="font-semibold text-navy">{address.name}</p>
                    <p>{address.address}</p>
                    <p>{address.city}{address.province ? `, ${address.province}` : ""}</p>
                    <p className="mt-1 text-ink-light">{address.phone}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={PinIcon} title="No saved addresses" text="Addresses are saved automatically when you place an order." />
            ))}

          {tab === "profile" && (
            <div className="rounded-2xl border border-line bg-white p-6">
              <dl className="grid gap-4 text-[15px] sm:grid-cols-2">
                <div><dt className="text-[12px] font-bold uppercase tracking-wide text-ink-light">Name</dt><dd className="mt-1 text-navy">{account.name}</dd></div>
                <div><dt className="text-[12px] font-bold uppercase tracking-wide text-ink-light">Phone</dt><dd className="mt-1 text-navy">{account.phone}</dd></div>
                <div><dt className="text-[12px] font-bold uppercase tracking-wide text-ink-light">Email</dt><dd className="mt-1 text-navy">{account.email || "Not provided"}</dd></div>
                <div><dt className="text-[12px] font-bold uppercase tracking-wide text-ink-light">Member since</dt><dd className="mt-1 text-navy">{formatDate(account.since)}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

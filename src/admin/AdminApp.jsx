import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Button from "../components/ui/Button.jsx";
import Overlay from "../components/ui/Modal.jsx";
import { Field, Input } from "../components/ui/Form.jsx";
import { Skeleton, ToastViewport } from "../components/ui/Feedback.jsx";
import { GridIcon, PackageIcon, BagIcon, UserIcon, StarIcon, MailIcon, TagIcon, ChartBarIcon, CogIcon, LogoutIcon, StoreIcon, MenuIcon, ShieldIcon } from "../components/ui/Icons.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { fetchStats } from "../api/admin.js";
import { useAsync } from "./ui.jsx";
import DashboardPage from "./DashboardPage.jsx";
import OrdersPage from "./OrdersPage.jsx";
import ProductsPage from "./ProductsPage.jsx";
import CustomersPage from "./CustomersPage.jsx";
import ReviewsPage from "./ReviewsPage.jsx";
import InboxPage from "./InboxPage.jsx";
import CouponsPage from "./CouponsPage.jsx";
import AnalyticsPage from "./AnalyticsPage.jsx";
import SettingsPage from "./SettingsPage.jsx";

const navItems = [
  { to: "/admin", label: "Dashboard", Icon: GridIcon, end: true },
  { to: "/admin/orders", label: "Orders", Icon: PackageIcon, badge: "pending" },
  { to: "/admin/products", label: "Products", Icon: BagIcon },
  { to: "/admin/customers", label: "Customers", Icon: UserIcon },
  { to: "/admin/reviews", label: "Reviews", Icon: StarIcon, badge: "pending_reviews" },
  { to: "/admin/inbox", label: "Inbox", Icon: MailIcon, badge: "new_messages" },
  { to: "/admin/coupons", label: "Coupons & creators", Icon: TagIcon },
  { to: "/admin/analytics", label: "Analytics", Icon: ChartBarIcon },
  { to: "/admin/settings", label: "Settings", Icon: CogIcon },
];

function Centered({ children }) {
  return <div className="grid min-h-screen place-items-center bg-tint px-5 py-10">{children}</div>;
}

function AdminLogin() {
  const auth = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.signIn(form.email, form.password);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Centered>
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-6 shadow-float sm:p-8">
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-teal">Store admin</p>
          <h1 className="mt-2 font-display text-[26px] font-extrabold text-navy">Sign in to manage Naaz & CO.</h1>
          <div className="mt-6 grid gap-4">
            <Field label="Email" required>
              <Input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </Field>
            <Field label="Password" required>
              <Input required type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </Field>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">{error}</p>}
          <Button type="submit" variant="navy" className="mt-6 w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="mt-4 text-[13px] text-ink">Admin access is granted by the store owner in Settings → Team. Customers sign in, and anyone can reset a forgotten password, on the <Link to="/account" className="font-semibold text-teal hover:underline">account page</Link>.</p>
        </form>
        <p className="mt-5 text-center text-[14px]">
          <Link to="/" className="font-semibold text-teal hover:underline">Back to the store</Link>
        </p>
      </div>
    </Centered>
  );
}

function NoAccess() {
  const auth = useAuth();
  return (
    <Centered>
      <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-float">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-coral-50 text-coral">
          <ShieldIcon className="size-7" />
        </span>
        <h1 className="mt-4 font-display text-[22px] font-extrabold text-navy">This account is not an admin.</h1>
        <p className="mt-2 text-[15px] text-ink">You are signed in as {auth.user?.email}. Ask the store owner to grant access in Settings → Team, or sign in with a different account.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="navy" onClick={() => auth.signOut()}>Sign out</Button>
          <Button to="/" variant="ghost">Back to the store</Button>
        </div>
      </div>
    </Centered>
  );
}

function Sidebar({ counts, onNavigate }) {
  const auth = useAuth();
  return (
    <div className="flex h-full flex-col bg-navy-900 text-white">
      <div className="px-5 py-5">
        <Link to="/admin" onClick={onNavigate}><Logo variant="light" /></Link>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan">Admin</p>
      </div>
      <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map(({ to, label, Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors ${isActive ? "bg-white text-navy" : "text-white/85 hover:bg-white/10"}`}
          >
            <Icon className="size-5 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && counts?.[badge] > 0 && <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white">{counts[badge]}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-white/85 hover:bg-white/10">
          <StoreIcon className="size-5" /> View store
        </Link>
        <button type="button" onClick={() => auth.signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold text-white/85 hover:bg-white/10">
          <LogoutIcon className="size-5" /> Sign out
        </button>
        <p className="truncate px-3 pt-2 text-[12px] text-white/60">{auth.user?.email}</p>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const counts = useAsync(() => fetchStats(7), [pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-tint">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar counts={counts.data} />
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <button type="button" aria-label="Open menu" title="Open menu" onClick={() => setMenuOpen(true)} className="grid size-11 place-items-center rounded-full text-navy hover:bg-tint">
          <MenuIcon className="size-6" />
        </button>
        <Logo />
        <span className="w-11" />
      </header>

      <Overlay open={menuOpen} onClose={() => setMenuOpen(false)} side="left" panelClass="!max-w-[280px] !bg-navy-900">
        <Sidebar counts={counts.data} onNavigate={() => setMenuOpen(false)} />
      </Overlay>

      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
      <ToastViewport />
    </div>
  );
}

export default function AdminApp() {
  const auth = useAuth();

  useEffect(() => {
    document.title = "Naaz & CO Admin";
    let robots = document.head.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex,nofollow");
  }, []);

  if (!auth.available) {
    return (
      <Centered>
        <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center">
          <h1 className="font-display text-[22px] font-extrabold text-navy">The admin panel needs the database.</h1>
          <p className="mt-2 text-[15px] text-ink">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the environment and rebuild.</p>
        </div>
      </Centered>
    );
  }
  if (auth.loading) {
    return (
      <Centered>
        <Skeleton className="h-72 w-full max-w-md" />
      </Centered>
    );
  }
  if (!auth.session) return <AdminLogin />;
  if (!auth.isAdmin) return <NoAccess />;

  return (
    <Shell>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Shell>
  );
}

import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AnnouncementBar from "./AnnouncementBar.jsx";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import CartDrawer from "./CartDrawer.jsx";
import SearchOverlay from "./SearchOverlay.jsx";
import MobileMenu from "./MobileMenu.jsx";
import WhatsAppButton from "./WhatsAppButton.jsx";
import Button from "../ui/Button.jsx";
import { ToastViewport, Skeleton } from "../ui/Feedback.jsx";
import { InfoIcon } from "../ui/Icons.jsx";
import { captureAttribution } from "../../analytics/attribution.js";
import { initAnalytics, trackPageView } from "../../analytics/tracking.js";
import { useStore } from "../../store/StoreProvider.jsx";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";

function RouteEffects() {
  const { pathname, search, hash } = useLocation();
  const { setUI } = useStore();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    captureAttribution(search);
    setUI({ cartOpen: false, searchOpen: false, menuOpen: false });
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    const timer = setTimeout(() => trackPageView(pathname + search, document.title), 50);
    return () => clearTimeout(timer);
  }, [pathname, search, hash, setUI]);

  return null;
}

function CatalogLoading() {
  return (
    <div className="wrap py-10" aria-busy="true" aria-label="Loading the store">
      <Skeleton className="h-[320px] w-full rounded-3xl" />
      <Skeleton className="mx-auto mt-10 h-8 w-1/3" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/5]" />
        ))}
      </div>
    </div>
  );
}

function CatalogError({ error, retry }) {
  return (
    <div className="wrap py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-line bg-tint/60 px-6 py-14 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-coral shadow-card">
          <InfoIcon className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-[24px] font-extrabold text-navy">We could not load the store.</h1>
        <p className="mt-2 text-[15px] text-ink">{error?.message || "Please check your connection and try again."}</p>
        <Button variant="navy" className="mt-6" onClick={retry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

export default function Layout() {
  const catalog = useCatalog();
  return (
    <div className="flex min-h-screen flex-col">
      <RouteEffects />
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        {catalog.status === "loading" ? <CatalogLoading /> : catalog.status === "error" ? <CatalogError error={catalog.error} retry={catalog.reload} /> : <Outlet />}
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <MobileMenu />
      <ToastViewport />
      <WhatsAppButton />
    </div>
  );
}

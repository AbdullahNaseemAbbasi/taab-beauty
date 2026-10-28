import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AnnouncementBar from "./AnnouncementBar.jsx";
import CreatorBanner from "./CreatorBanner.jsx";
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

/* Pages that work without the catalogue: they still open when it fails to load. */
const STANDALONE_PAGES = ["/about", "/contact", "/faq", "/track-order", "/payment-policy", "/shipping-policy", "/returns", "/privacy-policy", "/terms"];

function RouteEffects() {
  const { pathname, search, hash } = useLocation();
  const { setUI } = useStore();
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    initAnalytics();
  }, []);

  /* Campaign and creator parameters can arrive on any URL, including a filter change. */
  useEffect(() => {
    captureAttribution(search);
  }, [search]);

  /*
   * A new page (not a filter or sort change, which only edits the query string): close overlays,
   * scroll to the top and record one page view once the page has set its title.
   */
  useEffect(() => {
    setUI({ cartOpen: false, searchOpen: false, menuOpen: false });
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const titleBefore = document.title;
    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      trackPageView(pathname + searchRef.current, document.title);
    };
    const titleNode = document.querySelector("title");
    const observer = titleNode ? new MutationObserver(() => document.title !== titleBefore && send()) : null;
    observer?.observe(titleNode, { childList: true, characterData: true, subtree: true });
    const timer = setTimeout(send, 600);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [pathname, setUI]);

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

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
  const { pathname } = useLocation();
  const standalone = STANDALONE_PAGES.includes(pathname.replace(/\/$/, ""));
  return (
    <div className="flex min-h-screen flex-col">
      <RouteEffects />
      <AnnouncementBar />
      <Header />
      <CreatorBanner />
      <main className="flex-1">
        {catalog.status === "loading" ? <CatalogLoading /> : catalog.status === "error" && !standalone ? <CatalogError error={catalog.error} retry={catalog.reload} /> : <Outlet />}
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

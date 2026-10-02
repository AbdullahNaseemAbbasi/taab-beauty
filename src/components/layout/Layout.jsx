import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AnnouncementBar from "./AnnouncementBar.jsx";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import CartDrawer from "./CartDrawer.jsx";
import SearchOverlay from "./SearchOverlay.jsx";
import MobileMenu from "./MobileMenu.jsx";
import WhatsAppButton from "./WhatsAppButton.jsx";
import { ToastViewport } from "../ui/Feedback.jsx";
import { captureAttribution } from "../../analytics/attribution.js";
import { initAnalytics, trackPageView } from "../../analytics/tracking.js";
import { useStore } from "../../store/StoreProvider.jsx";

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
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    const timer = setTimeout(() => trackPageView(pathname + search, document.title), 50);
    return () => clearTimeout(timer);
  }, [pathname, search, hash, setUI]);

  return null;
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <RouteEffects />
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        <Outlet />
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

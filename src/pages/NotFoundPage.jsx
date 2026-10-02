import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Eyebrow } from "../components/ui/Typography.jsx";
import { useStore } from "../store/StoreProvider.jsx";

export default function NotFoundPage() {
  useSeo({ title: "Page Not Found", noindex: true });
  const { setUI } = useStore();
  return (
    <section className="bg-tint py-24 lg:py-32">
      <div className="wrap text-center">
        <Eyebrow>Error 404</Eyebrow>
        <h1 className="mt-4 font-display text-[36px] font-extrabold tracking-[-0.02em] text-navy sm:text-[48px]">We couldn’t find that page.</h1>
        <p className="mx-auto mt-4 max-w-[480px] text-[17px] text-ink">The link may be outdated or the product may have moved. Try a search or head back to the shop.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to="/shop" arrow>
            Back to shop
          </Button>
          <Button variant="outline" onClick={() => setUI({ searchOpen: true })}>
            Search products
          </Button>
        </div>
      </div>
    </section>
  );
}

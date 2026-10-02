import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { HeartIcon } from "../components/ui/Icons.jsx";
import { PageHeader } from "../components/sections/Sections.jsx";
import { ProductGrid } from "../components/product/ProductGrid.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";

export default function WishlistPage() {
  const { wishlist, addToCart, toast } = useStore();
  const { productById } = useCatalog();
  useSeo({ title: "Wishlist", path: "/wishlist", noindex: true });
  const items = wishlist.map((id) => productById[id]).filter(Boolean);
  const addable = items.filter((product) => product.stock > 0 && !product.variants);

  function addAll() {
    addable.forEach((product) => addToCart(product, { openDrawer: false, silent: true }));
    toast(`${addable.length} item${addable.length === 1 ? "" : "s"} added to your bag.`, { action: { label: "View bag", to: "/cart" } });
  }

  return (
    <>
      <PageHeader title={`Wishlist (${items.length})`} description="Saved on this device. Create an account to keep your wishlist across devices.">
        {addable.length > 0 && (
          <Button variant="navy" size="sm" onClick={addAll} className="mt-4">
            Add {addable.length} available item{addable.length === 1 ? "" : "s"} to bag
          </Button>
        )}
      </PageHeader>
      <section className="wrap py-8 sm:py-10">
        {items.length ? (
          <ProductGrid products={items} listName="wishlist" />
        ) : (
          <EmptyState icon={HeartIcon} title="Your wishlist is empty" text="Tap the heart on any product to save it here for later." action={{ label: "Discover best sellers", to: "/best-sellers" }} />
        )}
      </section>
    </>
  );
}

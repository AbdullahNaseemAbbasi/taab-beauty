import { useEffect } from "react";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { BagIcon } from "../components/ui/Icons.jsx";
import { PageHeader, Section } from "../components/sections/Sections.jsx";
import CartItem from "../components/commerce/CartItem.jsx";
import OrderSummary from "../components/commerce/OrderSummary.jsx";
import FreeShippingBar from "../components/commerce/FreeShippingBar.jsx";
import { ProductCarousel } from "../components/product/ProductGrid.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { ecommerce } from "../analytics/ecommerce.js";

export default function CartPage() {
  const { cart, clearCart } = useStore();
  const { products } = useCatalog();
  useSeo({ title: "Your Bag", path: "/cart", noindex: true });

  useEffect(() => {
    if (cart.lines.length) ecommerce.viewCart(cart.lines);
  }, []);

  const inCart = new Set(cart.lines.map((line) => line.productId));
  const suggestions = products.filter((product) => product.bestSeller && !inCart.has(product.id)).slice(0, 8);

  return (
    <>
      <PageHeader title={`Your Bag (${cart.totals.itemCount})`} description="Review your items, add a code and head to checkout. Cash on delivery is available on every order." />
      <section className="wrap py-8 sm:py-10">
        {cart.lines.length === 0 ? (
          <EmptyState icon={BagIcon} title="Your bag is empty" text="Browse the best sellers or pick up where you left off." action={{ label: "Shop best sellers", to: "/best-sellers" }} secondary={{ label: "View wishlist", to: "/wishlist" }} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
            <div>
              <FreeShippingBar remaining={cart.totals.freeShippingRemaining} />
              <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white px-4 sm:px-5">
                {cart.lines.map((line) => (
                  <CartItem key={line.key} line={line} />
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Button to="/shop" variant="ghost" size="sm">
                  Continue shopping
                </Button>
                <button type="button" onClick={clearCart} className="text-[13px] font-semibold text-ink-light hover:text-danger">
                  Clear bag
                </button>
              </div>
            </div>
            <div className="lg:sticky lg:top-24">
              <OrderSummary lines={cart.lines} totals={cart.totals} coupon={cart.coupon} showItems={false} />
              <Button to="/checkout" variant="navy" arrow className="mt-4 w-full">
                Proceed to checkout
              </Button>
            </div>
          </div>
        )}
      </section>
      {suggestions.length > 0 && (
        <Section eyebrow="You may also like" title="Customers also bought." bg="tint" align="left">
          <ProductCarousel products={suggestions} listName="cart_recommendations" />
        </Section>
      )}
    </>
  );
}

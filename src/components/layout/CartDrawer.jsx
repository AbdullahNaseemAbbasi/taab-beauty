import { useNavigate } from "react-router-dom";
import Overlay from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { BagIcon } from "../ui/Icons.jsx";
import { EmptyState } from "../ui/Feedback.jsx";
import CartItem from "../commerce/CartItem.jsx";
import FreeShippingBar from "../commerce/FreeShippingBar.jsx";
import { formatPrice } from "../../lib/format.js";
import { useStore } from "../../store/StoreProvider.jsx";

export default function CartDrawer() {
  const { ui, setUI, cart } = useStore();
  const navigate = useNavigate();
  const close = () => setUI({ cartOpen: false });
  const go = (path) => {
    close();
    navigate(path);
  };

  return (
    <Overlay open={ui.cartOpen} onClose={close} side="right" title={`Your Bag (${cart.totals.itemCount})`}>
      {cart.lines.length === 0 ? (
        <div className="flex flex-1 items-center p-5">
          <EmptyState icon={BagIcon} title="Your bag is empty" text="Add a few favourites and they will show up here." action={{ label: "Shop best sellers", to: "/best-sellers" }} className="w-full" />
        </div>
      ) : (
        <>
          <div className="px-5 pt-4">
            <FreeShippingBar remaining={cart.totals.freeShippingRemaining} />
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {cart.lines.map((line) => (
              <CartItem key={line.key} line={line} compact />
            ))}
          </ul>
          <div className="border-t border-line px-5 py-4">
            <div className="flex items-center justify-between text-[15px]">
              <span className="text-ink">Subtotal</span>
              <span className="font-display text-[18px] font-extrabold text-navy">{formatPrice(cart.totals.subtotal)}</span>
            </div>
            <p className="mt-1 text-[12px] text-ink-light">Delivery and discounts are calculated at checkout.</p>
            <div className="mt-4 grid gap-2">
              <Button variant="navy" arrow onClick={() => go("/checkout")}>
                Checkout
              </Button>
              <Button variant="ghost" onClick={() => go("/cart")}>
                View bag
              </Button>
            </div>
          </div>
        </>
      )}
    </Overlay>
  );
}

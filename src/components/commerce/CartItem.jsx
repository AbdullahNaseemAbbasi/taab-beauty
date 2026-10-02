import { Link } from "react-router-dom";
import { QuantityStepper } from "../ui/Navigation.jsx";
import { TrashIcon } from "../ui/Icons.jsx";
import { imageProps } from "../../lib/images.js";
import { formatPrice } from "../../lib/format.js";
import { variantStock } from "../../lib/catalog.js";
import { useStore } from "../../store/StoreProvider.jsx";

export default function CartItem({ line, compact = false }) {
  const { updateQuantity, removeLine, setUI } = useStore();
  const { product, variant, quantity, lineTotal, key } = line;
  const max = variantStock(product, line.variantId);

  return (
    <li className={`flex gap-4 ${compact ? "py-4" : "py-5"}`}>
      <Link to={`/product/${product.slug}`} onClick={() => setUI({ cartOpen: false })} className="shrink-0">
        <img {...imageProps(product.images[0], { width: 200, sizes: "96px", alt: product.name })} className={`${compact ? "size-20" : "size-24"} rounded-xl object-cover`} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wide text-ink-light">{product.brand}</span>
            <Link to={`/product/${product.slug}`} onClick={() => setUI({ cartOpen: false })} className="block text-[15px] font-semibold text-navy hover:text-coral">
              {product.name}
            </Link>
            {variant && <span className="mt-0.5 block text-[13px] text-ink">{product.variants.label}: {variant.name}</span>}
          </div>
          <button type="button" aria-label={`Remove ${product.name}`} onClick={() => removeLine(key)} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-light hover:bg-tint hover:text-danger">
            <TrashIcon className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantityStepper value={quantity} max={max} size="sm" onChange={(next) => updateQuantity(key, next)} />
          <span className="font-display text-[16px] font-extrabold text-navy">{formatPrice(lineTotal)}</span>
        </div>
        {max - quantity <= 2 && max > 0 && <p className="mt-1.5 text-[12px] font-medium text-coral">Only {max} left in stock</p>}
      </div>
    </li>
  );
}

import { Link } from "react-router-dom";
import RatingStars from "../ui/RatingStars.jsx";
import { Badge, Price } from "../ui/Typography.jsx";
import { HeartIcon, CompareIcon } from "../ui/Icons.jsx";
import { imageProps } from "../../lib/images.js";
import { discountPercent } from "../../lib/format.js";
import { useStore } from "../../store/StoreProvider.jsx";
import { ecommerce } from "../../analytics/ecommerce.js";
import { useVariant } from "../../analytics/experiments.js";

export default function ProductCard({ product, listName = "product_grid", eager = false }) {
  const { addToCart, isWishlisted, toggleWishlist, isCompared, toggleCompare } = useStore();
  const ctaVariant = useVariant("productCardCta");
  const percent = discountPercent(product.price, product.compareAtPrice);
  const soldOut = product.stock <= 0;
  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);
  const href = `/product/${product.slug}`;

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-white p-3 transition-shadow hover:shadow-float">
      <Link to={href} onClick={() => ecommerce.selectItem(product, listName)} className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-tint">
        <img
          {...imageProps(product.images[0], { width: 640, sizes: "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw", alt: product.name, eager })}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.images[1] && (
          <img
            {...imageProps(product.images[1], { width: 640, sizes: "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw", alt: "" })}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {soldOut ? <Badge tone="muted">Sold out</Badge> : null}
          {!soldOut && percent > 0 && <Badge tone="coral">-{percent}%</Badge>}
          {!soldOut && product.newArrival && <Badge tone="teal">New</Badge>}
          {!soldOut && product.bestSeller && !product.newArrival && <Badge tone="navy">Best seller</Badge>}
        </div>
      </Link>

      <div className="absolute top-5 right-5 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wishlisted}
          onClick={() => toggleWishlist(product)}
          className={`grid size-9 place-items-center rounded-full bg-white/90 shadow-card backdrop-blur-sm transition-colors ${wishlisted ? "text-coral" : "text-navy hover:text-coral"}`}
        >
          <HeartIcon filled={wishlisted} className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label={compared ? "Remove from compare" : "Add to compare"}
          title={compared ? "Remove from compare" : "Compare this product"}
          aria-pressed={compared}
          onClick={() => toggleCompare(product)}
          className={`grid size-9 place-items-center rounded-full bg-white/90 shadow-card backdrop-blur-sm transition-opacity lg:opacity-0 lg:group-hover:opacity-100 ${compared ? "text-teal opacity-100" : "text-navy hover:text-teal"}`}
        >
          <CompareIcon className="size-[18px]" />
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-light">{product.brand}</span>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-navy">
          <Link to={href} onClick={() => ecommerce.selectItem(product, listName)} className="hover:text-coral">
            {product.name}
          </Link>
        </h3>
        <RatingStars rating={product.rating} count={product.reviewCount} size="size-3.5" className="mt-2" />
        <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" className="mt-2" />
        <div className="mt-auto pt-4">
          {soldOut ? (
            <Link to={href} className="flex h-10 items-center justify-center rounded-full border border-line text-[14px] font-semibold text-ink">
              Notify me
            </Link>
          ) : product.variants ? (
            <Link to={href} className="flex h-10 items-center justify-center rounded-full bg-navy text-[14px] font-semibold text-white hover:bg-navy-800">
              Choose {product.variants.label.toLowerCase()}
            </Link>
          ) : (
            <button type="button" onClick={() => addToCart(product)} className="h-10 w-full rounded-full bg-navy text-[14px] font-semibold text-white hover:bg-navy-800">
              {ctaVariant === "B" ? "Add to cart" : "Add to bag"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

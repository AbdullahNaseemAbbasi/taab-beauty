import { useState } from "react";
import { imageProps } from "../../lib/images.js";
import { Badge } from "../ui/Typography.jsx";
import { discountPercent } from "../../lib/format.js";

export default function ProductGallery({ product }) {
  const [active, setActive] = useState(0);
  const percent = discountPercent(product.price, product.compareAtPrice);

  return (
    <div className="lg:sticky lg:top-24">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-tint">
        <img
          key={product.images[active]}
          {...imageProps(product.images[active], { width: 1200, sizes: "(min-width: 1024px) 50vw, 100vw", alt: `${product.name} image ${active + 1}`, eager: true })}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          {percent > 0 && <Badge tone="coral">-{percent}%</Badge>}
          {product.newArrival && <Badge tone="teal">New</Badge>}
          {product.bestSeller && <Badge tone="navy">Best seller</Badge>}
        </div>
      </div>
      {product.images.length > 1 && (
        <div className="mt-3 flex gap-3">
          {product.images.map((slug, index) => (
            <button
              key={slug}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === active}
              className={`size-20 overflow-hidden rounded-xl border-2 transition-colors ${index === active ? "border-navy" : "border-transparent hover:border-line"}`}
            >
              <img {...imageProps(slug, { width: 200, sizes: "80px", alt: "" })} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

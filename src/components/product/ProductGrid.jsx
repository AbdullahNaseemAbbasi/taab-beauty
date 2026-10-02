import { useEffect, useRef } from "react";
import ProductCard from "./ProductCard.jsx";
import { ProductCardSkeleton } from "../ui/Feedback.jsx";
import { ChevronLeftIcon, ChevronRightIcon } from "../ui/Icons.jsx";
import { ecommerce } from "../../analytics/ecommerce.js";

export function ProductGrid({ products, listName = "product_grid", loading = false, columns = "lg:grid-cols-4", eagerCount = 0 }) {
  useEffect(() => {
    if (products.length) ecommerce.viewItemList(products, listName);
  }, [listName, products.map((product) => product.id).join(",")]);

  if (loading) {
    return (
      <div className={`grid grid-cols-2 gap-4 sm:gap-6 ${columns}`}>
        {Array.from({ length: 8 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 gap-4 sm:gap-6 ${columns}`}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} listName={listName} eager={index < eagerCount} />
      ))}
    </div>
  );
}

export function ProductCarousel({ products, listName = "carousel" }) {
  const scroller = useRef(null);

  useEffect(() => {
    if (products.length) ecommerce.viewItemList(products, listName);
  }, [listName, products.map((product) => product.id).join(",")]);

  const scrollBy = (direction) => {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={scroller} className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        {products.map((product) => (
          <div key={product.id} className="w-[72%] shrink-0 snap-start sm:w-[46%] lg:w-[calc(25%-12px)]">
            <ProductCard product={product} listName={listName} />
          </div>
        ))}
      </div>
      <div className="mt-4 hidden justify-end gap-2 sm:flex">
        <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-1)} className="grid size-10 place-items-center rounded-full border border-line text-navy hover:border-navy">
          <ChevronLeftIcon className="size-5" />
        </button>
        <button type="button" aria-label="Scroll right" onClick={() => scrollBy(1)} className="grid size-10 place-items-center rounded-full border border-line text-navy hover:border-navy">
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}

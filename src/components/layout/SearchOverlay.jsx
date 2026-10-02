import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Overlay from "../ui/Modal.jsx";
import { SearchIcon, ArrowIcon } from "../ui/Icons.jsx";
import { Price } from "../ui/Typography.jsx";
import { searchProducts } from "../../lib/catalog.js";
import { imageProps } from "../../lib/images.js";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { useStore } from "../../store/StoreProvider.jsx";
import { ecommerce } from "../../analytics/ecommerce.js";

const popular = ["lipstick", "vitamin c serum", "foundation", "hair oil", "perfume", "brush set"];

export default function SearchOverlay() {
  const { ui, setUI } = useStore();
  const { products } = useCatalog();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const close = () => setUI({ searchOpen: false });
  const results = useMemo(() => (query.trim().length >= 2 ? searchProducts(query, products).slice(0, 6) : []), [query, products]);

  useEffect(() => {
    if (!ui.searchOpen) setQuery("");
  }, [ui.searchOpen]);

  function submit(event) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    ecommerce.search(term, searchProducts(term, products).length);
    close();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <Overlay open={ui.searchOpen} onClose={close} side="top" title="Search">
      <div className="mx-auto w-full max-w-3xl px-5 pb-8">
        <form onSubmit={submit} className="relative mt-5">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-ink-light" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, brands, concerns"
            aria-label="Search products"
            className="h-14 w-full rounded-full border border-line bg-tint pr-24 pl-13 text-[16px] text-navy outline-none focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/20 sm:pr-32"
          />
          <button type="submit" className="absolute top-1/2 right-2 h-10 -translate-y-1/2 rounded-full bg-navy px-4 text-[14px] font-semibold text-white sm:px-5">
            Search
          </button>
        </form>

        {results.length > 0 ? (
          <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
            {results.map((product) => (
              <li key={product.id}>
                <Link to={`/product/${product.slug}`} onClick={() => { ecommerce.selectItem(product, "search_suggestions"); close(); }} className="flex items-center gap-4 px-4 py-3 hover:bg-tint">
                  <img {...imageProps(product.images[0], { width: 120, sizes: "56px", alt: product.name })} className="size-14 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] uppercase tracking-wide text-ink-light">{product.brand}</span>
                    <span className="block truncate text-[15px] font-semibold text-navy">{product.name}</span>
                  </span>
                  <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={submit} className="flex w-full items-center justify-center gap-2 px-4 py-3 text-[14px] font-semibold text-teal hover:bg-tint">
                See all results for “{query}” <ArrowIcon className="size-4" />
              </button>
            </li>
          </ul>
        ) : query.trim().length >= 2 ? (
          <p className="mt-5 text-center text-[15px] text-ink">No products match “{query}”. Try a different word or browse the categories.</p>
        ) : (
          <div className="mt-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-ink-light">Popular searches</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {popular.map((term) => (
                <button key={term} type="button" onClick={() => setQuery(term)} className="rounded-full border border-line px-4 py-2 text-[14px] text-navy hover:border-navy">
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}

import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import { PageHeader } from "../components/sections/Sections.jsx";
import { ProductGrid } from "../components/product/ProductGrid.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { SearchIcon } from "../components/ui/Icons.jsx";
import { searchProducts } from "../lib/catalog.js";
import { products } from "../data/products.js";
import { ecommerce } from "../analytics/ecommerce.js";
import { useStore } from "../store/StoreProvider.jsx";

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const results = useMemo(() => searchProducts(query), [query]);
  const { setUI } = useStore();
  useSeo({ title: query ? `Search results for “${query}”` : "Search", path: `/search?q=${encodeURIComponent(query)}`, noindex: true });

  useEffect(() => {
    if (query) ecommerce.search(query, results.length);
  }, [query, results.length]);

  const fallback = products.filter((product) => product.bestSeller).slice(0, 4);

  return (
    <>
      <PageHeader title={query ? `Results for “${query}”` : "Search"} description={query ? `${results.length} product${results.length === 1 ? "" : "s"} found` : "Type a product, brand or concern to search."} />
      <section className="wrap py-10">
        {results.length ? (
          <ProductGrid products={results} listName="search_results" eagerCount={4} />
        ) : (
          <>
            <EmptyState
              icon={SearchIcon}
              title={query ? `Nothing found for “${query}”` : "Start a search"}
              text="Check the spelling, try a broader word like “serum” or “lipstick”, or browse the best sellers below."
              action={{ label: "Browse all products", to: "/shop" }}
            />
            <button type="button" onClick={() => setUI({ searchOpen: true })} className="mx-auto mt-4 block text-[14px] font-semibold text-teal hover:underline">
              Try another search
            </button>
            <h2 className="mt-12 font-display text-[24px] font-extrabold text-navy">Best sellers</h2>
            <div className="mt-6">
              <ProductGrid products={fallback} listName="search_fallback" />
            </div>
          </>
        )}
      </section>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Overlay from "../components/ui/Modal.jsx";
import { Select } from "../components/ui/Form.jsx";
import { Breadcrumbs, Pagination } from "../components/ui/Navigation.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { FilterIcon, SearchIcon } from "../components/ui/Icons.jsx";
import { ProductGrid } from "../components/product/ProductGrid.jsx";
import FilterSidebar from "../components/product/FilterSidebar.jsx";
import { PageHero, PageHeader } from "../components/sections/Sections.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { filterProducts, sortProducts, sortOptions } from "../lib/catalog.js";
import { breadcrumbSchema } from "../lib/schema.js";
import { track } from "../analytics/tracking.js";
import { EVENTS } from "../analytics/events.js";

const PAGE_SIZE = 12;
const listParam = (value) => (value ? value.split(",").filter(Boolean) : []);

function filtersFromParams(params, category) {
  return {
    category: category || params.get("category") || null,
    subcategories: listParam(params.get("sub")),
    brands: listParam(params.get("brand")),
    concerns: listParam(params.get("concern")),
    minPrice: params.get("min") ? Number(params.get("min")) : null,
    maxPrice: params.get("max") ? Number(params.get("max")) : null,
    inStock: params.get("stock") === "1",
    onSale: params.get("sale") === "1",
    minRating: params.get("rating") ? Number(params.get("rating")) : 0,
  };
}

function paramsFromFilters(filters, sort, lockedCategory) {
  const next = {};
  if (!lockedCategory && filters.category) next.category = filters.category;
  if (filters.subcategories?.length) next.sub = filters.subcategories.join(",");
  if (filters.brands?.length) next.brand = filters.brands.join(",");
  if (filters.concerns?.length) next.concern = filters.concerns.join(",");
  if (filters.minPrice != null) next.min = String(filters.minPrice);
  if (filters.maxPrice != null) next.max = String(filters.maxPrice);
  if (filters.inStock) next.stock = "1";
  if (filters.onSale) next.sale = "1";
  if (filters.minRating) next.rating = String(filters.minRating);
  if (sort && sort !== "featured") next.sort = sort;
  return next;
}

export default function ShopPage({ mode = "all", collection }) {
  const { category: categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { products, categoryBySlug, collections } = useCatalog();

  const category = mode === "category" ? categoryBySlug[categorySlug] : null;
  const collectionDef = mode === "collection" ? collections[collection] : null;
  const sort = params.get("sort") || "featured";
  const page = Math.max(1, Number(params.get("page") || 1));
  const filters = filtersFromParams(params, category?.slug);
  const filterKey = JSON.stringify(filters);

  const base = useMemo(() => {
    if (category) return products.filter((product) => product.category === category.slug);
    if (collectionDef) return products.filter(collectionDef.filter);
    return products;
  }, [products, category, collectionDef]);

  const filtered = useMemo(() => sortProducts(filterProducts(base, { ...filters, category: category ? null : filters.category }), sort), [base, filterKey, sort, category]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const title = category?.name || collectionDef?.name || "All Products";
  const description = category?.description || collectionDef?.description || "Every product we carry, across makeup, skincare, haircare, fragrance and tools.";
  const path = category ? `/shop/${category.slug}` : collectionDef ? `/${collectionDef.slug}` : "/shop";
  const crumbs = category ? [{ label: "Shop", to: "/shop" }, { label: category.name, to: path }] : [{ label: title, to: path }];

  useSeo({ title: `${title} in Pakistan`, description, path, jsonLd: [breadcrumbSchema(crumbs)] });

  useEffect(() => {
    if (category) track(EVENTS.SELECT_CATEGORY, { category: category.slug, placement: "category_page" });
  }, [category?.slug]);

  if ((mode === "category" && !category) || (mode === "collection" && !collectionDef)) return <NotFoundPage />;

  const updateFilters = (next) => {
    track(EVENTS.APPLY_FILTER, { ...next, placement: path });
    setParams(paramsFromFilters(next, sort, Boolean(category)));
  };
  const updateSort = (value) => setParams({ ...paramsFromFilters(filters, value, Boolean(category)) });
  const updatePage = (value) => {
    setParams({ ...paramsFromFilters(filters, sort, Boolean(category)), ...(value > 1 ? { page: String(value) } : {}) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sidebar = <FilterSidebar baseProducts={base} filters={filters} onChange={updateFilters} showCategory={!category} category={category?.slug} />;

  return (
    <>
      {category ? (
        <PageHero eyebrow={`Shop ${category.name}`} title={category.tagline} description={category.description} image={category.image} compact>
          <Breadcrumbs items={crumbs} className="mt-6" />
        </PageHero>
      ) : (
        <PageHeader title={collectionDef?.tagline || title} description={description}>
          <Breadcrumbs items={crumbs} className="mb-4" />
        </PageHeader>
      )}

      <section className="wrap py-8 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-ink">
            Showing <strong className="text-navy">{visible.length}</strong> of <strong className="text-navy">{filtered.length}</strong> products
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-[14px] font-semibold text-navy lg:hidden">
              <FilterIcon className="size-4" /> Filters
            </button>
            <label className="flex items-center gap-2 text-[14px] text-ink">
              <span className="hidden sm:inline">Sort by</span>
              <Select value={sort} onChange={(event) => updateSort(event.target.value)} aria-label="Sort products" className="h-11 w-40 py-0 sm:w-44">
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">{sidebar}</aside>
          <div>
            {visible.length ? (
              <>
                <ProductGrid products={visible} listName={path} columns="lg:grid-cols-3" eagerCount={3} />
                <Pagination page={page} pageCount={pageCount} onChange={updatePage} className="mt-10" />
              </>
            ) : (
              <EmptyState icon={SearchIcon} title="No products match these filters" text="Try removing a filter or two, or browse the full range." action={{ label: "Clear filters", to: path }} />
            )}
          </div>
        </div>
      </section>

      <Overlay open={drawerOpen} onClose={() => setDrawerOpen(false)} side="left" title="Filters">
        <div className="flex-1 overflow-y-auto px-5 pb-6">{sidebar}</div>
        <div className="border-t border-line p-4">
          <button type="button" onClick={() => setDrawerOpen(false)} className="h-12 w-full rounded-full bg-navy text-[15px] font-semibold text-white">
            Show {filtered.length} products
          </button>
        </div>
      </Overlay>
    </>
  );
}

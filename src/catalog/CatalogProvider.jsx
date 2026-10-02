import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchCatalog, mockCatalog } from "../api/catalog.js";
import { isLive } from "../api/client.js";
import { collections } from "../lib/collections.js";

/*
 * Loads the storefront dataset once and exposes it to every page. In mock
 * mode the data is available synchronously; in live mode pages see a loading
 * state (handled in Layout) until Supabase responds.
 */
const CatalogContext = createContext(null);

function index(list, key = "id") {
  return Object.fromEntries(list.map((item) => [item[key], item]));
}

export function CatalogProvider({ children }) {
  const [state, setState] = useState(() => (isLive ? { status: "loading", data: null, error: null } : { status: "ready", data: mockCatalog(), error: null }));

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: current.data ? "refreshing" : "loading", error: null }));
    try {
      const data = await fetchCatalog();
      setState({ status: "ready", data, error: null });
    } catch (error) {
      setState((current) => ({ status: current.data ? "ready" : "error", data: current.data, error }));
    }
  }, []);

  useEffect(() => {
    if (isLive) load();
  }, [load]);

  /* Lets the UI patch one product locally (e.g. fresh stock) without a full reload. */
  const updateProduct = useCallback((product) => {
    setState((current) => {
      if (!current.data) return current;
      const products = current.data.products.map((entry) => (entry.id === product.id ? product : entry));
      return { ...current, data: { ...current.data, products } };
    });
  }, []);

  const value = useMemo(() => {
    const data = state.data || mockCatalog();
    return {
      status: state.status,
      error: state.error,
      source: data.source,
      reload: load,
      updateProduct,
      products: data.products,
      productById: index(data.products),
      productBySlug: index(data.products, "slug"),
      categories: data.categories,
      categoryBySlug: index(data.categories, "slug"),
      brands: data.brands,
      concerns: data.concerns,
      concernById: index(data.concerns),
      reviews: data.reviews,
      articles: data.articles,
      articleBySlug: index(data.articles, "slug"),
      faqs: data.faqs,
      settings: data.settings,
      collections,
    };
  }, [state, load, updateProduct]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog must be used inside CatalogProvider");
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchCatalog, emptyCatalog, subscribeToCatalogChanges, stockOnlyUpdate } from "../api/catalog.js";
import { isLive } from "../api/client.js";
import { collections } from "../lib/collections.js";

/*
 * Loads the storefront dataset once and exposes it to every page. Pages see a
 * loading state (handled in Layout) until Supabase responds. The data also
 * refreshes by itself whenever an admin changes a product, category,
 * department, brand, review or setting (Supabase Realtime).
 */
const CatalogContext = createContext(null);

function index(list, key = "id") {
  return Object.fromEntries(list.map((item) => [item[key], item]));
}

/* Realtime reloads wait a few seconds plus a random extra, so open tabs do not all reload at the same moment. */
const reloadDelay = () => 2500 + Math.round(Math.random() * 1500);

export function CatalogProvider({ children }) {
  const [state, setState] = useState(() => (isLive ? { status: "loading", data: null, error: null } : { status: "ready", data: emptyCatalog(), error: null }));
  const refreshTimer = useRef(null);
  const dataRef = useRef(null);
  dataRef.current = state.data;

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
    if (!isLive) return undefined;
    load();
    const unsubscribe = subscribeToCatalogChanges((table, payload) => {
      /* An order only changes stock: patch that product in place instead of reloading everything. */
      if (table === "products" && payload?.eventType === "UPDATE") {
        const existing = dataRef.current?.products.find((entry) => entry.id === payload.new?.id);
        const next = stockOnlyUpdate(existing, payload.new);
        if (next) {
          setState((current) => (current.data ? { ...current, data: { ...current.data, products: current.data.products.map((entry) => (entry.id === next.id ? next : entry)) } } : current));
          return;
        }
      }
      /* Several rows often change together, so wait a moment and reload once. */
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, reloadDelay());
    });
    return () => {
      clearTimeout(refreshTimer.current);
      unsubscribe();
    };
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
    /* Until the store loads, lists are empty. */
    const data = state.data || emptyCatalog();
    const categoryBySlug = index(data.categories, "slug");
    /* Menus list only what can be bought: categories with products, and the product types in use inside them. */
    const stockedCategories = data.categories
      .map((category) => {
        const own = data.products.filter((product) => product.category === category.slug);
        return own.length ? { ...category, subcategories: category.subcategories.filter((sub) => own.some((product) => product.subcategory === sub)) } : null;
      })
      .filter(Boolean);
    return {
      status: state.status,
      error: state.error,
      reload: load,
      updateProduct,
      products: data.products,
      productById: index(data.products),
      productBySlug: index(data.products, "slug"),
      categories: data.categories,
      stockedCategories,
      categoryBySlug,
      departments: data.departments,
      departmentById: index(data.departments),
      /* Department a product belongs to, through its category. */
      departmentOf: (product) => categoryBySlug[product.category]?.department || "other",
      brands: data.brands,
      concerns: data.concerns,
      reviews: data.reviews,
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

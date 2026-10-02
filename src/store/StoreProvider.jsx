import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { enrichLines, computeTotals, lineKey } from "../lib/cart.js";
import { variantStock } from "../lib/catalog.js";
import { validateCoupon } from "../api/orders.js";
import { ecommerce } from "../analytics/ecommerce.js";

const STORAGE_KEY = "taab:store:v1";
const MAX_COMPARE = 4;
const MAX_RECENT = 8;

const initialState = {
  cart: { lines: [], coupon: null },
  wishlist: [],
  compare: [],
  recent: [],
  ui: { cartOpen: false, searchOpen: false, menuOpen: false, stickyBar: false, toasts: [] },
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return initialState;
    return { ...initialState, ...saved, ui: initialState.ui };
  } catch {
    return initialState;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case "cart/add": {
      const { productId, variantId, quantity, max } = action;
      const key = lineKey(productId, variantId);
      const existing = state.cart.lines.find((line) => lineKey(line.productId, line.variantId) === key);
      const lines = existing
        ? state.cart.lines.map((line) =>
            lineKey(line.productId, line.variantId) === key ? { ...line, quantity: Math.min(line.quantity + quantity, max) } : line
          )
        : [...state.cart.lines, { productId, variantId: variantId || null, quantity: Math.min(quantity, max) }];
      return { ...state, cart: { ...state.cart, lines } };
    }
    case "cart/update": {
      const lines = state.cart.lines
        .map((line) => (lineKey(line.productId, line.variantId) === action.key ? { ...line, quantity: action.quantity } : line))
        .filter((line) => line.quantity > 0);
      return { ...state, cart: { ...state.cart, lines } };
    }
    case "cart/remove":
      return { ...state, cart: { ...state.cart, lines: state.cart.lines.filter((line) => lineKey(line.productId, line.variantId) !== action.key) } };
    case "cart/clear":
      return { ...state, cart: { lines: [], coupon: null } };
    case "cart/coupon":
      return { ...state, cart: { ...state.cart, coupon: action.coupon } };
    case "wishlist/toggle":
      return {
        ...state,
        wishlist: state.wishlist.includes(action.productId) ? state.wishlist.filter((id) => id !== action.productId) : [action.productId, ...state.wishlist],
      };
    case "compare/toggle": {
      if (state.compare.includes(action.productId)) return { ...state, compare: state.compare.filter((id) => id !== action.productId) };
      if (state.compare.length >= MAX_COMPARE) return state;
      return { ...state, compare: [...state.compare, action.productId] };
    }
    case "compare/clear":
      return { ...state, compare: [] };
    case "recent/add":
      return { ...state, recent: [action.productId, ...state.recent.filter((id) => id !== action.productId)].slice(0, MAX_RECENT) };
    case "ui/set": {
      const unchanged = Object.keys(action.patch).every((key) => state.ui[key] === action.patch[key]);
      if (unchanged) return state;
      return { ...state, ui: { ...state.ui, ...action.patch } };
    }
    case "ui/toast":
      return { ...state, ui: { ...state.ui, toasts: [...state.ui.toasts, action.toast] } };
    case "ui/dismiss":
      return { ...state, ui: { ...state.ui, toasts: state.ui.toasts.filter((toast) => toast.id !== action.id) } };
    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { productById, settings } = useCatalog();
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const toastTimers = useRef({});

  useEffect(() => {
    try {
      const { ui, ...persisted } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      /* ignore */
    }
  }, [state.cart, state.wishlist, state.compare, state.recent]);

  const toast = useCallback((message, options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    dispatch({ type: "ui/toast", toast: { id, message, type: options.type || "success", action: options.action || null } });
    toastTimers.current[id] = setTimeout(() => dispatch({ type: "ui/dismiss", id }), options.duration || 3500);
  }, []);

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current[id]);
    dispatch({ type: "ui/dismiss", id });
  }, []);

  const setUI = useCallback((patch) => dispatch({ type: "ui/set", patch }), []);
  const addRecent = useCallback((productId) => dispatch({ type: "recent/add", productId }), []);

  const lines = useMemo(() => enrichLines(state.cart.lines, productById), [state.cart.lines, productById]);
  const totals = useMemo(() => computeTotals(lines, state.cart.coupon, settings.shipping), [lines, state.cart.coupon, settings.shipping]);

  const addToCart = useCallback(
    (product, { quantity = 1, variantId = null, openDrawer = true, silent = false } = {}) => {
      const max = variantStock(product, variantId);
      if (max <= 0) {
        toast("This item is currently out of stock.", { type: "error" });
        return false;
      }
      const key = lineKey(product.id, variantId);
      const current = state.cart.lines.find((line) => lineKey(line.productId, line.variantId) === key)?.quantity || 0;
      if (current >= max) {
        toast(`Only ${max} in stock for this item.`, { type: "error" });
        return false;
      }
      dispatch({ type: "cart/add", productId: product.id, variantId, quantity, max });
      ecommerce.addToCart(product, quantity);
      if (!silent) toast(`${product.name} added to your bag.`, { action: { label: "View bag", to: "/cart" } });
      if (openDrawer) dispatch({ type: "ui/set", patch: { cartOpen: true } });
      return true;
    },
    [state.cart.lines, toast]
  );

  const updateQuantity = useCallback(
    (key, quantity) => {
      const line = lines.find((entry) => entry.key === key);
      if (!line) return;
      const max = variantStock(line.product, line.variantId);
      if (quantity > max) {
        toast(`Only ${max} in stock for this item.`, { type: "error" });
        return;
      }
      if (quantity < line.quantity) ecommerce.removeFromCart(line.product, line.quantity - quantity);
      else ecommerce.addToCart(line.product, quantity - line.quantity);
      dispatch({ type: "cart/update", key, quantity });
    },
    [lines, toast]
  );

  const removeLine = useCallback(
    (key) => {
      const line = lines.find((entry) => entry.key === key);
      if (line) ecommerce.removeFromCart(line.product, line.quantity);
      dispatch({ type: "cart/remove", key });
    },
    [lines]
  );

  const applyCoupon = useCallback(
    async (code) => {
      try {
        const result = await validateCoupon(code, totals.subtotal);
        ecommerce.coupon(code, Boolean(result.valid), result.discount || 0);
        if (result.valid) {
          dispatch({ type: "cart/coupon", coupon: { code: result.code, type: result.type, value: result.value, minOrder: result.minOrder || 0, creatorId: result.creatorId || null } });
          toast(`Code ${result.code} applied.`);
        }
        return result;
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    [totals.subtotal, toast]
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      cart: { lines, totals, coupon: state.cart.coupon },
      addToCart,
      updateQuantity,
      removeLine,
      clearCart: () => dispatch({ type: "cart/clear" }),
      applyCoupon,
      removeCoupon: () => dispatch({ type: "cart/coupon", coupon: null }),
      wishlist: state.wishlist,
      isWishlisted: (productId) => state.wishlist.includes(productId),
      toggleWishlist: (product) => {
        const added = !state.wishlist.includes(product.id);
        dispatch({ type: "wishlist/toggle", productId: product.id });
        ecommerce.wishlist(product, added);
        toast(added ? `${product.name} saved to your wishlist.` : `${product.name} removed from your wishlist.`, { action: added ? { label: "View", to: "/wishlist" } : null });
      },
      compare: state.compare,
      isCompared: (productId) => state.compare.includes(productId),
      toggleCompare: (product) => {
        const adding = !state.compare.includes(product.id);
        if (adding && state.compare.length >= MAX_COMPARE) {
          toast(`You can compare up to ${MAX_COMPARE} products.`, { type: "error" });
          return;
        }
        dispatch({ type: "compare/toggle", productId: product.id });
        if (adding) toast(`${product.name} added to compare.`, { action: { label: "Compare", to: "/compare" } });
      },
      clearCompare: () => dispatch({ type: "compare/clear" }),
      recent: state.recent.map((id) => productById[id]).filter(Boolean),
      addRecent,
      ui: state.ui,
      setUI,
      toast,
      dismissToast,
    }),
    [state, lines, totals, productById, addToCart, updateQuantity, removeLine, applyCoupon, toast, dismissToast, setUI, addRecent]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}

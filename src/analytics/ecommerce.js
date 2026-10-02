/*
 * Typed helpers that turn products, carts and orders into GA4-style ecommerce
 * payloads. Pages call these instead of hand-building objects, so the item
 * schema stays identical across view, cart, checkout and purchase events.
 */
import { track } from "./tracking.js";
import { EVENTS } from "./events.js";

export function toItem(product, quantity = 1, extra = {}) {
  return {
    item_id: product.sku || product.id,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category,
    item_category2: product.subcategory,
    price: product.price,
    quantity,
    ...extra,
  };
}

function cartValue(lines) {
  return lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
}

export const ecommerce = {
  viewItemList(products, listName) {
    return track(EVENTS.VIEW_ITEM_LIST, {
      item_list_name: listName,
      items: products.slice(0, 20).map((product, index) => toItem(product, 1, { index })),
    });
  },
  selectItem(product, listName) {
    return track(EVENTS.SELECT_ITEM, { item_list_name: listName, items: [toItem(product)] });
  },
  viewItem(product) {
    return track(EVENTS.VIEW_ITEM, { value: product.price, items: [toItem(product)] });
  },
  addToCart(product, quantity = 1) {
    return track(EVENTS.ADD_TO_CART, { value: product.price * quantity, items: [toItem(product, quantity)] });
  },
  removeFromCart(product, quantity = 1) {
    return track(EVENTS.REMOVE_FROM_CART, { value: product.price * quantity, items: [toItem(product, quantity)] });
  },
  viewCart(lines) {
    return track(EVENTS.VIEW_CART, { value: cartValue(lines), items: lines.map((l) => toItem(l.product, l.quantity)) });
  },
  beginCheckout(lines, coupon) {
    return track(EVENTS.BEGIN_CHECKOUT, {
      value: cartValue(lines),
      coupon: coupon?.code || null,
      items: lines.map((l) => toItem(l.product, l.quantity)),
    });
  },
  addShippingInfo(lines, city) {
    return track(EVENTS.ADD_SHIPPING_INFO, { value: cartValue(lines), shipping_tier: city, items: lines.map((l) => toItem(l.product, l.quantity)) });
  },
  addPaymentInfo(lines, method) {
    return track(EVENTS.ADD_PAYMENT_INFO, { value: cartValue(lines), payment_type: method, items: lines.map((l) => toItem(l.product, l.quantity)) });
  },
  purchase(order) {
    return track(EVENTS.PURCHASE, {
      transaction_id: order.id,
      value: order.totals.total,
      shipping: order.totals.shipping,
      coupon: order.coupon?.code || null,
      payment_type: order.payment,
      items: order.lines.map((l) => toItem(l.product, l.quantity)),
    });
  },
  wishlist(product, added = true) {
    return track(added ? EVENTS.ADD_TO_WISHLIST : EVENTS.REMOVE_FROM_WISHLIST, { value: product.price, items: [toItem(product)] });
  },
  search(term, resultCount) {
    return track(EVENTS.SEARCH, { search_term: term, result_count: resultCount });
  },
  coupon(code, accepted, discount = 0) {
    return track(accepted ? EVENTS.COUPON_APPLIED : EVENTS.COUPON_REJECTED, { coupon: code, discount });
  },
  whatsapp(context, product) {
    return track(EVENTS.WHATSAPP_CLICK, { context, items: product ? [toItem(product)] : [] });
  },
};

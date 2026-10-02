/*
 * Canonical event names. Components never use raw strings; they import these
 * constants so every event is discoverable, consistent and easy to map to
 * Meta, TikTok and GA4 equivalents in tracking.js.
 */
export const EVENTS = {
  PAGE_VIEW: "page_view",
  VIEW_ITEM: "view_item",
  VIEW_ITEM_LIST: "view_item_list",
  SELECT_ITEM: "select_item",
  SEARCH: "search",
  SELECT_CATEGORY: "select_category",
  APPLY_FILTER: "apply_filter",
  ADD_TO_WISHLIST: "add_to_wishlist",
  REMOVE_FROM_WISHLIST: "remove_from_wishlist",
  ADD_TO_COMPARE: "add_to_compare",
  ADD_TO_CART: "add_to_cart",
  REMOVE_FROM_CART: "remove_from_cart",
  VIEW_CART: "view_cart",
  BEGIN_CHECKOUT: "begin_checkout",
  ADD_SHIPPING_INFO: "add_shipping_info",
  ADD_PAYMENT_INFO: "add_payment_info",
  PURCHASE: "purchase",
  COUPON_APPLIED: "coupon_applied",
  COUPON_REJECTED: "coupon_rejected",
  WHATSAPP_CLICK: "whatsapp_click",
  CONTACT_FORM_SUBMIT: "contact_form_submit",
  NEWSLETTER_SIGNUP: "newsletter_signup",
  PRODUCT_SHARE: "product_share",
  REVIEW_SUBMIT: "review_submit",
  TRACK_ORDER: "track_order",
  STOCK_ALERT: "stock_alert_signup",
  ORDER_WHATSAPP_SHARE: "order_whatsapp_share",
  CREATOR_OFFER_VIEW: "creator_offer_view",
  EXPERIMENT_EXPOSURE: "experiment_exposure",
  PROMO_CLICK: "promo_click",
  SOCIAL_CLICK: "social_click",
};

/* Mapping to the vendor-specific standard event names. */
export const VENDOR_EVENTS = {
  [EVENTS.PAGE_VIEW]: { meta: "PageView", tiktok: "Pageview", ga: "page_view" },
  [EVENTS.VIEW_ITEM]: { meta: "ViewContent", tiktok: "ViewContent", ga: "view_item" },
  [EVENTS.SEARCH]: { meta: "Search", tiktok: "Search", ga: "search" },
  [EVENTS.ADD_TO_WISHLIST]: { meta: "AddToWishlist", tiktok: "AddToWishlist", ga: "add_to_wishlist" },
  [EVENTS.ADD_TO_CART]: { meta: "AddToCart", tiktok: "AddToCart", ga: "add_to_cart" },
  [EVENTS.BEGIN_CHECKOUT]: { meta: "InitiateCheckout", tiktok: "InitiateCheckout", ga: "begin_checkout" },
  [EVENTS.ADD_PAYMENT_INFO]: { meta: "AddPaymentInfo", tiktok: "AddPaymentInfo", ga: "add_payment_info" },
  [EVENTS.PURCHASE]: { meta: "Purchase", tiktok: "CompletePayment", ga: "purchase" },
  [EVENTS.NEWSLETTER_SIGNUP]: { meta: "Lead", tiktok: "SubmitForm", ga: "generate_lead" },
  [EVENTS.CONTACT_FORM_SUBMIT]: { meta: "Contact", tiktok: "Contact", ga: "generate_lead" },
  [EVENTS.WHATSAPP_CLICK]: { meta: "Contact", tiktok: "Contact", ga: "whatsapp_click" },
};

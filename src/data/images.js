/*
 * Photos on the pages themselves, keyed by purpose. Values are Burst slugs or
 * full image links (see src/lib/images.js). Product, category and department
 * photos live in the database.
 */
export const images = {
  hero: {
    home: "woman-with-white-crisp-shopping-carrier-bags",
    homeAlt: "A smiling shopper carrying white shopping bags",
    about: "young-man-preparing-a-package-for-fulfillment",
    aboutAlt: "Packing an order into a box",
    contact: "beauty-product-flatlay",
  },
  promo: {
    pink: "blush-makeup-and-candles",
  },
  about: ["young-man-preparing-a-package-for-fulfillment", "small-business-interior", "beauty-products-and-flower"],
};

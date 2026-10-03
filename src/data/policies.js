/*
 * Store policies. Placeholders in braces ({advancePercent}, {freeOver}, …) are
 * filled from the live settings by src/lib/storeText.js, so the text follows
 * whatever is set in Admin → Settings.
 */
export const policies = {
  payment: {
    slug: "payment-policy",
    title: "Payment & Advance Policy",
    updated: "2026-10-04",
    sections: [
      { heading: "How payment works", body: ["We do not offer cash on delivery for the full amount. Every order is paid in two parts: {advancePercent} of the order total in advance when you place the order, and the remaining {balancePercent} when the parcel arrives.", "The exact amounts are shown at checkout and on your order page before you pay anything."] },
      { heading: "Paying the advance", body: ["After you place the order, send the advance by one of the methods shown at checkout ({methods}) to the account displayed on your order page. Pay only into the account shown on this website.", "Share the payment receipt on WhatsApp with your order number. As soon as we see the payment, the order is confirmed and packed. Stock is held for 48 hours; if the advance has not arrived by then, we cancel the order and the items go back on sale."] },
      { heading: "Paying the balance", body: ["The remaining amount is paid in cash to the courier when your order is delivered. Please keep the exact amount ready. If you prefer, you can also transfer the balance before dispatch and nothing is due at the door."] },
      { heading: "Why we ask for an advance", body: ["An advance protects both sides: it lets us reserve your items and book the courier with confidence, and it keeps prices lower for everyone by avoiding parcels that are refused at the door."] },
      { heading: "Cancellations and refunds of the advance", body: ["If you cancel before the order is dispatched, the advance is refunded in full within 3 working days to the account it came from.", "If we cannot fulfil your order for any reason, the advance is refunded in full.", "If a parcel is refused at the door, or cannot be delivered after two attempts because nobody is available, the courier charges for both directions are deducted from the advance and the rest is refunded.", "Returns accepted under our Returns policy are refunded for everything you paid for the returned item."] },
      { heading: "Staying safe", body: ["We never ask for your card PIN, a one-time password or your wallet password. If anyone asks for these in our name, do not share them and message us on WhatsApp."] },
    ],
  },
  shipping: {
    slug: "shipping-policy",
    title: "Shipping Policy",
    updated: "2026-10-04",
    sections: [
      { heading: "Delivery areas", body: ["We deliver to every city and town in Pakistan through TCS, Leopards and M&P. International shipping is not available yet."] },
      { heading: "Delivery times", body: ["Orders are dispatched once the advance payment is received. Advances received before 2pm (Monday to Saturday) are dispatched the same day; later ones go out the next working day.", "Karachi: next business day. Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Hyderabad: 2 to 3 business days. Other areas: 3 to 5 business days."] },
      { heading: "Delivery charges", body: ["Free delivery on orders of {freeOver} or more. A flat {fee} applies to orders below that amount."] },
      { heading: "Tracking", body: ["Once the courier collects your parcel, the courier name and tracking number appear on the Track Order page (enter your order number and phone number). We also share them on WhatsApp."] },
      { heading: "At the door", body: ["The courier collects the balance shown on your order page ({balancePercent} of the order total). You may check that the parcel is sealed before paying.", "Couriers attempt delivery twice. If both attempts fail, the parcel returns to us and the courier charges are deducted from your advance, as described in the Payment policy."] },
    ],
  },
  returns: {
    slug: "returns",
    title: "Returns, Refunds & Warranty",
    updated: "2026-10-04",
    sections: [
      { heading: "7-day returns", body: ["Unused items in their original packaging can be returned within 7 days of delivery for a full refund or exchange.", "Beauty: products must be unopened and sealed. For hygiene and safety reasons, opened or used cosmetics cannot be returned unless they are damaged or faulty.", "Appliances and gadgets: the item must be unused, with its box, accessories, manuals and warranty card. Earbuds and other in-ear products cannot be returned once the hygiene seal is broken, unless faulty.", "Clothes: items must be unworn and unwashed, with the tags attached. Wrong size? We exchange it for another size if it is in stock."] },
      { heading: "Damaged, faulty or wrong items", body: ["If your order arrives damaged, leaking, not working or different from what you ordered, send photos or a short video of the product and packaging to our WhatsApp within 48 hours of delivery. We will ship a replacement at no cost or issue a full refund, your choice."] },
      { heading: "Warranty on appliances and gadgets", body: ["The warranty period for each product is written on its product page and starts on the delivery date. It covers manufacturing faults in normal use. It does not cover physical or liquid damage, burnt parts from voltage surges, normal wear of batteries and cables, or items opened or repaired by someone else.", "To claim, message us on WhatsApp with your order number and a short video of the fault. If the fault is covered we repair or replace the item, and we pay the courier both ways."] },
      { heading: "How to return", body: ["Message us on WhatsApp with your order number and the reason. We will arrange a courier pickup from your address. Return shipping is free for damaged, faulty or incorrect items; for change-of-mind returns the {fee} courier fee is deducted from the refund."] },
      { heading: "Refund timing", body: ["Refunds are sent by bank transfer, Easypaisa or JazzCash within 3 working days of receiving the returned item, and cover everything you paid for it: the advance and the balance."] },
    ],
  },
  privacy: {
    slug: "privacy-policy",
    title: "Privacy Policy",
    updated: "2026-10-04",
    sections: [
      { heading: "What we collect", body: ["To fulfil an order we collect your name, phone number, email address (optional) and delivery address. If you create an account we also store your order history and saved address. We never ask for or store card numbers, PINs or wallet passwords."] },
      { heading: "Payment receipts", body: ["Receipts you send us on WhatsApp are used only to match your payment to your order."] },
      { heading: "Analytics and advertising", body: ["We use analytics tools (such as Google Analytics, Meta Pixel and TikTok Pixel) to understand which pages, products and campaigns lead to orders. This data is aggregated and tied to a browser session, not to your name. You can opt out of ad personalisation in your Facebook, Google and TikTok settings."] },
      { heading: "Marketing messages", body: ["We send order updates on WhatsApp or by phone. Promotional messages are sent only if you subscribe to the newsletter, and you can unsubscribe at any time."] },
      { heading: "Sharing", body: ["Your delivery details are shared with the courier delivering your order and nobody else. We do not sell personal data."] },
      { heading: "Your rights", body: ["Message us on WhatsApp or through the Contact page to see, correct or delete the personal data we hold about you. We respond within 7 days."] },
    ],
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    updated: "2026-10-04",
    sections: [
      { heading: "Orders", body: ["Placing an order reserves the items for 48 hours. The order is confirmed when we receive the advance payment and you see it marked as confirmed on your order page. We may cancel orders that cannot be fulfilled due to stock errors or suspected fraud, in which case any payment is refunded in full."] },
      { heading: "Prices and payment", body: ["All prices are in Pakistani Rupees and include applicable taxes. Prices can change without notice, but the price shown at checkout is the price you pay. Payment is made as {advancePercent} in advance and {balancePercent} on delivery, as set out in the Payment policy."] },
      { heading: "Promotions and coupons", body: ["Coupon codes cannot be combined unless stated. Creator codes are valid for the period shown on the creator's post. {name} may withdraw a promotion at any time."] },
      { heading: "Product information", body: ["We describe products as accurately as we can. Colours may vary slightly between screens and real life, and clothing measurements can differ by a centimetre or two. Always patch test a new beauty product on the inner arm before full use, and read the manual before using an electrical item."] },
      { heading: "Liability", body: ["Our liability for any order is limited to the amount paid for that order. Nothing in these terms limits rights you have under Pakistani consumer law."] },
      { heading: "Contact", body: ["{name}, {address}. WhatsApp or call {phone}."] },
    ],
  },
};

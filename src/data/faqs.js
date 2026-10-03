/*
 * FAQs. Placeholders in braces are filled from the live settings by
 * src/lib/storeText.js (see policies.js).
 */
export const faqs = [
  {
    category: "Payment",
    items: [
      { question: "Do you offer cash on delivery?", answer: "Not for the full amount. You pay {advancePercent} in advance to confirm the order and the remaining {balancePercent} to the courier when it arrives." },
      { question: "How do I pay the advance?", answer: "Place your order, then send the advance by one of the methods shown at checkout ({methods}) to the account on your order page, and share the receipt on WhatsApp with your order number. Your order is confirmed as soon as we see the payment." },
      { question: "What if I do not pay the advance?", answer: "We hold your items for 48 hours. If the advance has not arrived by then, we cancel the order and nothing is owed." },
      { question: "Will I get my advance back if I cancel?", answer: "Yes. If you cancel before the order is dispatched, the advance is refunded in full within 3 working days. The Payment policy explains what happens after dispatch." },
      { question: "Is it safe to pay in advance?", answer: "Pay only into the account shown on this website, and keep your receipt. We never ask for a card PIN, a one-time password or your wallet password." },
    ],
  },
  {
    category: "Orders & Delivery",
    items: [
      { question: "How long does delivery take?", answer: "Orders are dispatched once the advance is received: the same day if it arrives before 2pm, otherwise the next working day. Karachi deliveries arrive the next business day. Lahore, Islamabad and other major cities take 2 to 3 business days; remote areas can take up to 5." },
      { question: "How much is delivery?", answer: "Delivery is free on orders over {freeOver}. Below that, a flat {fee} applies anywhere in Pakistan, however many departments you order from." },
      { question: "Can I track my order?", answer: "Yes. Enter your order number and phone number on the Tracking page to see the payment status, the courier, the tracking number and the latest update." },
      { question: "Can I change or cancel my order?", answer: "You can change or cancel an order any time before it is dispatched. Message us on WhatsApp with your order number." },
    ],
  },
  {
    category: "Clothing",
    items: [
      { question: "How do I choose the right size?", answer: "Each product page lists the available sizes and the fit. If you are between sizes, message us your usual size and height on WhatsApp and we will suggest one." },
      { question: "Can I exchange a size?", answer: "Yes, within 7 days of delivery, as long as the item is unworn and unwashed with its tags on and the other size is in stock." },
    ],
  },
  {
    category: "Beauty",
    items: [
      { question: "Are your beauty products authentic?", answer: "Every product is sourced directly from the brand or its authorised distributor and arrives sealed. We share batch numbers on request." },
      { question: "Are the products suitable for sensitive skin?", answer: "The Saaf Skin Lab range is fragrance-free and formulated for sensitive, acne-prone skin. Each product page lists full ingredients so you can check for anything you react to." },
      { question: "How do I choose my foundation shade?", answer: "Send us a daylight photo of your jawline on WhatsApp and we will recommend a shade. Wrong shades can be exchanged within 7 days if unopened." },
    ],
  },
  {
    category: "Appliances & Gadgets",
    items: [
      { question: "Do appliances and gadgets come with a warranty?", answer: "Yes. The warranty period is written on each product page. If an item develops a fault within that period, message us on WhatsApp with your order number and a short video of the problem, and we will repair or replace it." },
      { question: "Are they checked before they ship?", answer: "Every electrical item is powered on and inspected before it is packed, then shipped in its original box with all accessories." },
      { question: "Will the plugs work in Pakistan?", answer: "Yes. Mains-powered items are 220 to 240 V and come with a plug that fits Pakistani sockets, or with an adapter in the box." },
    ],
  },
  {
    category: "Returns & Warranty",
    items: [
      { question: "What is your return policy?", answer: "Unused items in their original packaging can be returned within 7 days of delivery for a refund or exchange. Opened beauty products cannot be returned for hygiene reasons unless they arrived damaged or faulty." },
      { question: "My order arrived damaged or not working. What now?", answer: "Send a photo or short video of the product and packaging on WhatsApp within 48 hours of delivery. We will send a replacement at no cost or refund everything you paid." },
    ],
  },
];

export const allFaqs = faqs.flatMap((group) => group.items);

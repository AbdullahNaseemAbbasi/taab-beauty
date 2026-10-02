export const faqs = [
  {
    category: "Orders & Delivery",
    items: [
      { question: "How long does delivery take?", answer: "Orders placed before 2pm ship the same day. Karachi deliveries arrive the next business day. Lahore, Islamabad and other major cities take 2 to 3 business days; remote areas can take up to 5." },
      { question: "How much is delivery?", answer: "Delivery is free on orders over Rs. 7,000. Below that, a flat Rs. 250 applies anywhere in Pakistan." },
      { question: "Can I track my order?", answer: "Yes. You receive a tracking number by SMS and email as soon as the courier collects your parcel. You can also enter your order number on the Track Order page." },
      { question: "Can I change or cancel my order?", answer: "You can cancel or change an order any time before it is packed, usually within 2 hours of ordering. Message us on WhatsApp with your order number." },
    ],
  },
  {
    category: "Payments",
    items: [
      { question: "Do you offer cash on delivery?", answer: "Yes, across Pakistan. Please keep the exact amount ready for the courier." },
      { question: "Which other payment methods do you accept?", answer: "Bank transfer to our Meezan Bank account (details shown at checkout), and debit or credit cards where online payment is enabled." },
      { question: "Is it safe to pay online?", answer: "Card payments are processed by our payment partner on their secure page. TAAB never sees or stores your card number." },
    ],
  },
  {
    category: "Products",
    items: [
      { question: "Are your products authentic?", answer: "Every product is sourced directly from the brand or its authorised distributor and arrives sealed. We publish batch numbers on request." },
      { question: "Are the products suitable for sensitive skin?", answer: "The Saaf Skin Lab range is fragrance-free and formulated for sensitive, acne-prone skin. Each product page lists full ingredients so you can check for anything you react to." },
      { question: "How do I choose my foundation shade?", answer: "Read our foundation shade guide in the Journal, or send us a daylight photo of your jawline on WhatsApp and we will recommend a shade. Wrong shades can be exchanged within 7 days if unopened." },
      { question: "Do you test on animals?", answer: "No. TAAB and every brand we carry is cruelty-free." },
    ],
  },
  {
    category: "Returns",
    items: [
      { question: "What is your return policy?", answer: "Unopened, sealed products can be returned within 7 days of delivery for a refund or exchange. Opened products cannot be returned for hygiene reasons unless they arrived damaged or faulty." },
      { question: "My product arrived damaged. What now?", answer: "Send a photo of the product and packaging on WhatsApp within 48 hours of delivery. We will send a replacement at no cost." },
    ],
  },
];

export const allFaqs = faqs.flatMap((group) => group.items);

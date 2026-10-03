export const faqs = [
  {
    category: "Orders & Delivery",
    items: [
      { question: "How long does delivery take?", answer: "Orders placed before 2pm ship the same day. Karachi deliveries arrive the next business day. Lahore, Islamabad and other major cities take 2 to 3 business days; remote areas can take up to 5." },
      { question: "How much is delivery?", answer: "Delivery is free on orders over Rs. 7,000. Below that, a flat Rs. 250 applies anywhere in Pakistan, whether you order one lipstick or a lipstick, a kettle and a power bank together." },
      { question: "Can I track my order?", answer: "Yes. Enter your order number and phone number on the Track Order page to see the courier, the tracking number and the latest status." },
      { question: "Can I change or cancel my order?", answer: "You can cancel or change an order any time before it is packed, usually within 2 hours of ordering. Message us on WhatsApp with your order number." },
    ],
  },
  {
    category: "Payments",
    items: [
      { question: "Do you offer cash on delivery?", answer: "Yes, across Pakistan. Please keep the exact amount ready for the courier." },
      { question: "Which other payment methods do you accept?", answer: "Bank transfer to our Meezan Bank account (details shown at checkout), and debit or credit cards where online payment is enabled." },
      { question: "Is it safe to pay online?", answer: "Card payments are processed by our payment partner on their secure page. Naaz & CO never sees or stores your card number." },
    ],
  },
  {
    category: "Beauty",
    items: [
      { question: "Are your beauty products authentic?", answer: "Every product is sourced directly from the brand or its authorised distributor and arrives sealed. We share batch numbers on request." },
      { question: "Are the products suitable for sensitive skin?", answer: "The Saaf Skin Lab range is fragrance-free and formulated for sensitive, acne-prone skin. Each product page lists full ingredients so you can check for anything you react to." },
      { question: "How do I choose my foundation shade?", answer: "Read our foundation shade guide in the Journal, or send us a daylight photo of your jawline on WhatsApp and we will recommend a shade. Wrong shades can be exchanged within 7 days if unopened." },
    ],
  },
  {
    category: "Electronics & Kitchen",
    items: [
      { question: "Do electronics come with a warranty?", answer: "Yes. The warranty period is written on each product page. If an item develops a fault within that period, message us on WhatsApp with your order number and a short video of the problem, and we will repair or replace it." },
      { question: "Are the electronics checked before they ship?", answer: "Every electronic item is powered on and inspected before it is packed, then shipped in its original box with all accessories." },
      { question: "Will the plugs work in Pakistan?", answer: "Yes. Mains-powered items are 220 to 240 V and come with a plug that fits Pakistani sockets, or with an adapter in the box." },
      { question: "Is the cookware safe for gas stoves?", answer: "Yes, all our cookware works on gas. Induction compatibility is listed under Specifications on each product page." },
    ],
  },
  {
    category: "Returns & Warranty",
    items: [
      { question: "What is your return policy?", answer: "Unused items in their original packaging can be returned within 7 days of delivery for a refund or exchange. Opened beauty products cannot be returned for hygiene reasons unless they arrived damaged or faulty." },
      { question: "My order arrived damaged or not working. What now?", answer: "Send a photo or short video of the product and packaging on WhatsApp within 48 hours of delivery. We will send a replacement at no cost or refund you in full." },
    ],
  },
];

export const allFaqs = faqs.flatMap((group) => group.items);

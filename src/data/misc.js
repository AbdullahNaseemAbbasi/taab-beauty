import { images } from "./images.js";

/* Coupons. Creator codes carry a creatorId so revenue can be attributed. */
export const coupons = [
  { code: "WELCOME10", type: "percent", value: 10, minOrder: 1500, description: "10% off your first order", creatorId: null },
  { code: "TAAB500", type: "fixed", value: 500, minOrder: 4000, description: "Rs. 500 off orders over Rs. 4,000", creatorId: null },
  { code: "FREESHIP", type: "shipping", value: 0, minOrder: 0, description: "Free delivery on any order", creatorId: null },
  { code: "HIRA15", type: "percent", value: 15, minOrder: 2000, description: "Creator code: 15% off", creatorId: "hira" },
  { code: "MAHNOOR10", type: "percent", value: 10, minOrder: 0, description: "Creator code: 10% off", creatorId: "mahnoor" },
];

export function findCoupon(code) {
  return coupons.find((coupon) => coupon.code.toLowerCase() === String(code || "").trim().toLowerCase()) || null;
}

/* Instagram feed placeholders (replace with the Instagram Basic Display API feed). */
export const instagramPosts = images.instagram.map((slug, index) => ({
  id: `ig-${index + 1}`,
  image: slug,
  caption: ["Sunday flatlay, Rooh edition.", "The starter set that sells out every month.", "Palette season.", "Nails, done. Flowers, optional.", "Brushes we actually use.", "Everything you need for the mehndi."][index],
  likes: [1240, 980, 2210, 760, 1530, 1890][index],
  url: "https://instagram.com/taab.beauty",
}));

/* Sample orders so Track Order and My Account have something to show. */
export const sampleOrders = [
  {
    id: "TB-240912-0148",
    phone: "03001234567",
    placedAt: "2026-09-12T11:20:00+05:00",
    status: "delivered",
    payment: "cod",
    customer: { name: "Zainab Khan", city: "Karachi" },
    lines: [
      { slug: "karachi-sunset-eyeshadow-palette", quantity: 1 },
      { slug: "velvet-matte-lipstick", quantity: 2, variant: "Rooh (true red)" },
    ],
    totals: { subtotal: 8600, discount: 0, shipping: 0, total: 8600 },
    timeline: [
      { status: "created", label: "Order placed", at: "2026-09-12T11:20:00+05:00" },
      { status: "confirmed", label: "Payment confirmed (COD)", at: "2026-09-12T11:25:00+05:00" },
      { status: "processing", label: "Processing", at: "2026-09-12T12:10:00+05:00" },
      { status: "packed", label: "Packed", at: "2026-09-12T15:40:00+05:00" },
      { status: "shipped", label: "Shipped with TCS", at: "2026-09-12T18:05:00+05:00", tracking: "TCS-77819920" },
      { status: "out_for_delivery", label: "Out for delivery", at: "2026-09-13T09:30:00+05:00" },
      { status: "delivered", label: "Delivered", at: "2026-09-13T14:15:00+05:00" },
    ],
  },
  {
    id: "TB-241001-0211",
    phone: "03001234567",
    placedAt: "2026-10-01T19:48:00+05:00",
    status: "shipped",
    payment: "bank",
    customer: { name: "Zainab Khan", city: "Karachi" },
    lines: [{ slug: "glow-boost-vitamin-c-serum", quantity: 1 }, { slug: "overnight-recovery-cream", quantity: 1 }],
    totals: { subtotal: 7000, discount: 700, shipping: 0, total: 6300 },
    coupon: { code: "WELCOME10" },
    timeline: [
      { status: "created", label: "Order placed", at: "2026-10-01T19:48:00+05:00" },
      { status: "confirmed", label: "Bank transfer confirmed", at: "2026-10-02T10:02:00+05:00" },
      { status: "processing", label: "Processing", at: "2026-10-02T10:30:00+05:00" },
      { status: "packed", label: "Packed", at: "2026-10-02T13:15:00+05:00" },
      { status: "shipped", label: "Shipped with Leopards", at: "2026-10-02T17:40:00+05:00", tracking: "LEO-55120087" },
    ],
  },
];

export const orderStatuses = [
  { id: "created", label: "Order Placed" },
  { id: "confirmed", label: "Payment Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "out_for_delivery", label: "Out for Delivery" },
  { id: "delivered", label: "Delivered" },
];

export const terminalStatuses = {
  cancelled: "Cancelled",
  failed: "Payment Failed",
  returned: "Returned",
  refunded: "Refunded",
};

export const cities = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Hyderabad", "Quetta", "Sialkot", "Gujranwala", "Sukkur", "Other"];

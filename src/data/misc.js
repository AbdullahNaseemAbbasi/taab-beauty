export const orderStatuses = [
  { id: "created", label: "Order Placed" },
  { id: "confirmed", label: "Advance Received, Confirmed" },
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

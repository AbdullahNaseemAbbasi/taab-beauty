/* Pure cart maths. No data access here: callers pass the product index and shipping settings in. */

export function lineKey(productId, variantId) {
  return variantId ? `${productId}:${variantId}` : productId;
}

/* Attaches product objects and prices to the compact stored lines; drops lines whose product no longer exists. */
export function enrichLines(lines, productById) {
  return lines
    .map((line) => {
      const product = productById[line.productId];
      if (!product) return null;
      const variant = product.variants?.options.find((option) => option.id === line.variantId) || null;
      return {
        ...line,
        key: lineKey(line.productId, line.variantId),
        product,
        variant,
        unitPrice: product.price,
        lineTotal: product.price * line.quantity,
      };
    })
    .filter(Boolean);
}

export function couponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.minOrder && subtotal < coupon.minOrder) return 0;
  if (coupon.type === "percent") return Math.round((subtotal * coupon.value) / 100);
  if (coupon.type === "fixed") return Math.min(coupon.value, subtotal);
  return 0;
}

const defaultShipping = { freeShippingThreshold: 7000, shippingFee: 250 };

export function computeTotals(enrichedLines, coupon = null, shipping = defaultShipping) {
  const subtotal = enrichedLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = couponDiscount(coupon, subtotal);
  const afterDiscount = Math.max(subtotal - discount, 0);
  const freeShipping = afterDiscount >= shipping.freeShippingThreshold || coupon?.type === "shipping";
  const fee = enrichedLines.length === 0 || freeShipping ? 0 : shipping.shippingFee;
  return {
    subtotal,
    discount,
    shipping: fee,
    total: afterDiscount + fee,
    itemCount: enrichedLines.reduce((sum, line) => sum + line.quantity, 0),
    freeShippingRemaining: freeShipping ? 0 : Math.max(shipping.freeShippingThreshold - afterDiscount, 0),
  };
}

/* Attaches catalogue products to an order's lines so summaries can show images and names. */
export function hydrateOrder(order, { productById = {}, productBySlug = {} } = {}) {
  if (!order) return null;
  return {
    ...order,
    lines: (order.lines || []).map((line) => {
      const product = (line.productId && productById[line.productId]) || (line.slug && productBySlug[line.slug]) || null;
      const unitPrice = line.unitPrice ?? product?.price ?? 0;
      return {
        ...line,
        key: lineKey(line.productId || line.slug, line.variantId),
        product: product || { id: line.productId, slug: line.slug, name: line.name || "Product", images: [], price: unitPrice },
        unitPrice,
        lineTotal: line.lineTotal ?? unitPrice * line.quantity,
      };
    }),
  };
}

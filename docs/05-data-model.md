# Step 6 · Data model

The database is Supabase (Postgres); the schema is in `supabase/migrations/20261003000001_schema.sql` and `src/data/*.js` holds the seed (mock) dataset in the same shape, mapped to camelCase by `src/api/catalog.js`. Column names in the database are snake_case versions of the fields below.

## Product

```
id, sku, name, slug, brand, category, subcategory,
price, compareAtPrice, images[], description,
benefits[], ingredients[], howToUse, size,
stock, rating, reviewCount, tags[], concerns[],
variants? { label, options[ { id, name, hex, stock } ] },
featured, bestSeller, newArrival
```

Derived: `discount = round((compareAtPrice - price) / compareAtPrice * 100)`, `inStock = stock > 0` (or the selected variant's stock). "In stock" is never shown when stock is 0; the stepper and add-to-bag enforce the limit.

## Category · Brand · Concern

```
category: id, name, slug, tagline, description, image, subcategories[]
brand:    id, name, tagline, description, featured
concern:  id, name, description, image
collection: slug, name, tagline, description, filter(product) → bool
```

## Review

```
id, productId, author, city, rating(1-5), date, verified, title, body, photo?, helpful
```
Production: `status` (pending | approved | rejected) added for moderation; `orderId` links a verified purchase.

## Journal article

```
slug, title, excerpt, topic, author, date, readTime, image,
content[ { type: p | h2 | ul | tip | product, text? | items? | slug? } ]
```

## Cart (client state)

```
lines[ { productId, variantId?, quantity } ], coupon?
```
Enriched at read time into `{ product, variant, unitPrice, lineTotal, key }`. Totals: subtotal, discount, shipping, total, itemCount, freeShippingRemaining.

## Coupon

```
code, type (percent | fixed | shipping), value, minOrder, description, creatorId?
```

## Order

```
id (TB-YYMMDD-NNNN), placedAt, status, payment (cod | bank | card), notes,
customer { name, phone, email, address, city, province, postalCode, instructions },
lines[ { productId, slug, variant, quantity, unitPrice } ],
totals { subtotal, discount, shipping, total, itemCount },
coupon { code, creatorId }?,
attribution { sessionId, firstTouch, lastTouch, creatorRef, device },
timeline[ { status, label, at, tracking? } ]
```

Status flow: `created → confirmed → processing → packed → shipped → out_for_delivery → delivered`; terminal: `cancelled`, `failed`, `returned`, `refunded`.

## Customer (future)

```
id, name, phone (unique), email, addresses[], createdAt,
ordersCount, totalRevenue, firstOrderAt, lastOrderAt,
segment (new | first_time | repeat | high_value | inactive)
```
Segments are computed nightly: first_time = 1 order; repeat ≥ 2; high_value = top 10% lifetime revenue; inactive = no order in 120 days.

## Inventory (future)

```
sku, variantId?, onHand, reserved, available = onHand - reserved,
lowStockThreshold, updatedAt
```
Reserve on order creation, release on cancel, decrement on dispatch.

## Analytics event

```
event, timestamp, session_id, page_path,
source, campaign, ad_content, creator_ref,
value?, currency, items[]?, ...event-specific fields
```

## Admin entities (future)

Products, Categories, Brands, Inventory, Orders, Customers, Payments, Coupons, Discounts, Reviews, Blog, Marketing (campaigns, creators), Analytics, Shipping (couriers, zones), Settings. All keyed on the IDs above so no renumbering is needed when the backend arrives.

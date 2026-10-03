# Step 6 · Data model

The database is Supabase (Postgres); the schema is in `supabase/migrations/20261003000001_schema.sql` and `src/data/*.js` holds the seed (mock) dataset in the same shape, mapped to camelCase by `src/api/catalog.js`. Column names in the database are snake_case versions of the fields below.

## Product

```
id, sku, name, slug, brand, category, subcategory,
price, compareAtPrice, images[], description,
benefits[], ingredients[], howToUse, size,
stock, rating, reviewCount, tags[], concerns[],
variants? { label, options[ { id, name, hex, stock } ] },
specs[ { label, value } ], warranty,
featured, bestSeller, newArrival
```

Beauty products fill `ingredients`, `howToUse` and `concerns`. Products in other departments leave `ingredients` empty and fill `specs` (shown as a table under Specifications), `warranty` (appliances) and `size` (shown as "In the box"). The product page chooses its labels from the category's department.

`variants.display` is `swatch` (colour circles, each option has a `hex`) or `text` (buttons, used for clothing sizes).

Derived: `discount = round((compareAtPrice - price) / compareAtPrice * 100)`, `inStock = stock > 0` (or the selected variant's stock). "In stock" is never shown when stock is 0; the stepper and add-to-bag enforce the limit.

## Category · Brand · Concern

```
department: id, name, tagline, description, image, sort_order, active     (table `departments`, edited in Admin → Catalogue)
category: id, name, slug, department (→ departments.id), tagline, description, image, subcategories[], sort_order, active
brand:    id, name, tagline, description, featured
concern:  id, name, description, image
collection: slug, name, tagline, description, filter(product) → bool
```

## Review

```
id, productId, author, city, rating(1-5), date, verified, title, body, photo?, helpful
```
Production: `status` (pending | approved | rejected) added for moderation; `orderId` links a verified purchase.

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
id (NZ-YYMMDD-NNNN), placedAt, status, payment (bank | easypaisa | jazzcash), notes,
paymentStatus (pending | advance_paid | paid | failed | refunded),
advance { percent, amount, balance },
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

## Settings (table `settings`, one JSON value per key)

```
shipping      free_shipping_threshold, shipping_fee, estimated_days                    public
store         name, currency, card_enabled                                           public
payments      advance_percent, methods[ { id, label, enabled, bank, account_title, account_number } ]   public
contact       phone, whatsapp, email, hours, address, instagram, facebook, tiktok, youtube, announcement   public
notifications ntfy_topic, admin_url                                                  admins only
```

There is no cash on delivery. `place_order` saves `advance_percent` and `advance_amount` on the order from the `payments` setting at that moment, so later changes to the percentage do not alter existing orders.

## Accounts and admin

```
profiles      id (= auth user id), name, phone, address, city, province
admins        email, user_id            who may open /admin; checked by is_admin()
product_costs product_id, cost          admin-only, kept out of the public products table
orders.user_id                          set when the order is placed while signed in
```

The admin panel manages Products, the Catalogue (departments, categories, brands), Orders and payments, Customers, Coupons and creators, Reviews, Inbox (messages, abandoned checkouts, stock alerts, subscribers), Analytics and Settings (payment accounts, advance, delivery, store details, notifications, team). FAQs and concerns are still edited through the seed data or the Supabase table editor.

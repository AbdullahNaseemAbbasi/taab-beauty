# Roadmap · from static storefront to full platform

## Phase 0 (this repository)

Static storefront with the complete customer-facing experience: catalogue, search, filters, product pages, bag, guest checkout, order confirmation and tracking (local records plus samples), wishlist, compare, account shell, journal, trust pages, analytics layer, attribution, A/B scaffold, SEO. Deployed on Netlify; forms via Netlify Forms.

## Phase 1 · Orders for real (2 to 3 weeks)

- Backend: Supabase (Postgres + Auth + Storage) or a small Node/Nest API on Railway.
- Tables from `docs/05-data-model.md`: products, variants, inventory, orders, order_items, customers, coupons, reviews.
- `POST /api/orders` replaces `createOrder()`; SMS confirmation via a local gateway; WhatsApp template message.
- Courier integration: TCS / Leopards API for booking and tracking numbers.
- Stock reservation on order, decrement on dispatch; "In stock" driven by the inventory table.
- Payments: COD and bank transfer first; add a card gateway (e.g. a local PSP) behind the existing `payments.methods` config.

## Phase 2 · Measurement (1 to 2 weeks, parallel)

- Google Tag Manager container with GA4, Meta Pixel and TikTok Pixel fed from the existing `dataLayer`.
- Server-side Conversions API and TikTok Events API from the order service, deduped on order id.
- Warehouse: BigQuery or Postgres; nightly jobs join orders to ad spend exports by campaign and ad content, and to creators by ref and coupon.
- First dashboard: funnel, product performance, ad performance, with the metric definitions in `docs/06`.

## Phase 3 · Admin (3 to 4 weeks)

Admin app (same design system) with the sections listed in the brief: dashboard, products, categories, brands, inventory, orders, customers, payments, coupons, discounts, reviews (moderation), blog, marketing (campaigns, creators, UTM builder), analytics, shipping, settings. Role-based access; audit log on order and inventory changes.

## Phase 4 · Retention

Customer segments (new, first-time, repeat, high-value, inactive) computed nightly; WhatsApp and email flows per segment; review requests after delivery; replenishment reminders by product; loyalty points.

## Phase 5 · Growth

Creator portal (links, codes, payouts), Google Merchant Center feed from the product table, personalised recommendations from co-purchase data, international shipping and multi-currency.

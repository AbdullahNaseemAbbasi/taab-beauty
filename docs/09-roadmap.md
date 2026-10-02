# Roadmap · from static storefront to full platform

## Phase 0 (this repository) · done

Storefront with the complete customer-facing experience on a Supabase backend: catalogue, search, filters, product pages, bag, guest checkout (server-validated `place_order`), order confirmation and tracking (`get_order` by order id + phone), wishlist, compare, account shell, journal, trust pages, analytics events stored in the database, attribution, A/B scaffold, SEO. Mock data seeded; the same frontend runs on local mock data when no keys are present.

## Phase 1 · Operations (2 to 3 weeks)

- Replace the seeded mock data with real products, photography, prices and stock (dashboard Table editor until the admin exists).
- SMS confirmation via a local gateway and a WhatsApp template message, triggered by a database webhook on `orders` insert (Supabase Edge Function).
- Courier integration: TCS / Leopards API for booking and tracking numbers, written back to `orders.courier` and `orders.tracking_code`; status updates append to `timeline`.
- Phone OTP sign-in (Supabase Auth) so the account page lists all of a customer's orders, not only those placed on the device.
- Payments: COD and bank transfer are live; add a card gateway behind `settings.store.card_enabled` and `payments.methods`.
- Recompute `products.rating` / `review_count` from approved reviews with a trigger once real reviews start arriving.

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

# Roadmap · from static storefront to full platform

## Phase 0 (this repository) · done

Storefront with the complete customer-facing experience on a Supabase backend: catalogue, search, filters, product pages, bag, guest checkout (server-validated `place_order`), order confirmation and tracking (`get_order` by order id + phone), wishlist, compare, journal, trust pages, analytics events stored in the database, attribution, A/B scaffold, SEO. Customer accounts (email + password, saved details, order history). Admin panel at `/admin`: dashboard, orders, products, customers, reviews, inbox, coupons and creators, analytics, settings, team. Mock data seeded; the storefront also runs on local mock data when no keys are present.

## Phase 1 · Operations (2 to 3 weeks)

- Replace the seeded mock data with real products, photography, prices and stock (Admin → Products).
- Mail provider (SMTP) for password-reset and order emails; then switch email confirmation on.
- SMS confirmation via a local gateway and a WhatsApp template message, triggered by a database webhook on `orders` insert (Supabase Edge Function).
- Courier integration: TCS / Leopards API for booking and tracking numbers, written back to `orders.courier` and `orders.tracking_code`; status updates append to `timeline`.
- Phone OTP sign-in as an alternative to email + password.
- Payments: COD and bank transfer are live; add a card gateway behind `settings.store.card_enabled` and `payments.methods`.

## Phase 2 · Measurement (1 to 2 weeks, parallel)

- Google Tag Manager container with GA4, Meta Pixel and TikTok Pixel fed from the existing `dataLayer`.
- Server-side Conversions API and TikTok Events API from the order service, deduped on order id.
- Warehouse: BigQuery or Postgres; nightly jobs join orders to ad spend exports by campaign and ad content, and to creators by ref and coupon.
- First dashboard: funnel, product performance, ad performance, with the metric definitions in `docs/06`.

## Phase 3 · Admin, second pass

The first admin panel is live (see Phase 0). Still to add: category and brand editors, journal (blog) editor, UTM link builder, ad-spend import for ROAS, roles narrower than full admin (for example a packer who only sees orders), audit log on order and inventory changes.

## Phase 4 · Retention

Customer segments (new, first-time, repeat, high-value, inactive) computed nightly; WhatsApp and email flows per segment; review requests after delivery; replenishment reminders by product; loyalty points.

## Phase 5 · Growth

Creator portal (links, codes, payouts), Google Merchant Center feed from the product table, personalised recommendations from co-purchase data, international shipping and multi-currency.

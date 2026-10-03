# Roadmap · from static storefront to full platform

## Phase 0 (this repository) · done

Multi-department storefront on a Supabase backend: departments, categories and brands managed in the database, search, filters, product pages (ingredients for beauty, specifications and warranty for appliances, sizes for clothes), bag, guest checkout with a server-validated `place_order`, advance payment instead of cash on delivery, order confirmation and tracking, wishlist, compare, customer accounts, trust pages and policies that follow the live settings, analytics events, attribution, SEO. Admin panel at `/admin`: dashboard, orders and payments, products, catalogue, customers, reviews, inbox, coupons and creators, analytics, settings, team. Storefront and admin update live through Supabase Realtime. Sample data seeded; the storefront also runs on local mock data when no keys are present.

## Phase 1 · Operations (2 to 3 weeks)

- Replace the seeded mock data with real products, photography, prices and stock (Admin → Products).
- Mail provider (SMTP) for password-reset and order emails; then switch email confirmation on.
- SMS confirmation via a local gateway and a WhatsApp template message, triggered by a database webhook on `orders` insert (Supabase Edge Function).
- Courier integration: TCS / Leopards API for booking and tracking numbers, written back to `orders.courier` and `orders.tracking_code`; status updates append to `timeline`.
- Phone OTP sign-in as an alternative to email + password.
- Payments: advance by bank transfer, Easypaisa or JazzCash is confirmed by hand today. Add a payment gateway (card, wallet APIs) so advances are confirmed automatically, and a scheduled job that cancels orders whose advance has not arrived in 48 hours.

## Phase 2 · Measurement (1 to 2 weeks, parallel)

- Google Tag Manager container with GA4, Meta Pixel and TikTok Pixel fed from the existing `dataLayer`.
- Server-side Conversions API and TikTok Events API from the order service, deduped on order id.
- Warehouse: BigQuery or Postgres; nightly jobs join orders to ad spend exports by campaign and ad content, and to creators by ref and coupon.
- First dashboard: funnel, product performance, ad performance, with the metric definitions in `docs/06`.

## Phase 3 · Admin, second pass

The admin panel is live (see Phase 0). Still to add: FAQ and policy editors, home-page content editor, UTM link builder, ad-spend import for ROAS, roles narrower than full admin (for example a packer who only sees orders), audit log on order and inventory changes.

## Phase 4 · Retention

Customer segments (new, first-time, repeat, high-value, inactive) computed nightly; WhatsApp and email flows per segment; review requests after delivery; replenishment reminders by product; loyalty points.

## Phase 5 · Growth

Creator portal (links, codes, payouts), Google Merchant Center feed from the product table, personalised recommendations from co-purchase data, international shipping and multi-currency.

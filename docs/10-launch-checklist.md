# Launch checklist · what is done, what you must do, how to run the store day to day

## Done and tested (3 October 2026)

- Storefront: 18 pages, mobile-first (320 to 2560 px), bag, guest checkout, wishlist, compare, search, journal, FAQ, policies.
- Backend: Supabase project `taab-beauty` (Mumbai). Orders are priced, stock-checked and written server-side. Coupons and creator codes validated server-side. Max 5 orders per phone per hour.
- Order tracking: by order number + phone, with courier name, tracking code and courier link, expected delivery date, and a WhatsApp link from SMS/WhatsApp messages (`/track-order?id=TB-...&phone=03...`).
- Notifications: every new order and contact message is pushed to your phone through the **ntfy** app (free). Customers can also send you their order summary on WhatsApp in one tap from the confirmation page.
- Growth: creator links (`?ref=creator`) show a banner and auto-apply the creator's code; back-in-stock alerts; abandoned checkouts saved with phone number for follow-up; same-day-dispatch countdown; first-party analytics events; A/B test scaffold; SEO (sitemap, structured data, share image); PWA (add to home screen).
- Reports in the database (Supabase → Table editor → Views): `report_daily_sales`, `report_product_performance`, `report_sources`, `report_funnel_daily`, `report_customers`, `report_abandoned_checkouts`.

## Before you announce the store (your side)

1. **Real information** → send it and it is live in minutes. Everything is in `src/config/site.js` (phone, WhatsApp number, email, address, bank account, social links, hours) plus the product data (`src/data/products.js` → `npm run seed`, or edit directly in Supabase Table editor → `products`).
2. **Install ntfy on your phone** (Android: Play Store "ntfy", iPhone: App Store "ntfy"). Open it → Subscribe to topic → enter the topic name from `D:\taab-beauty\.env.supabase.local` (line `NTFY_TOPIC=`). From then on every order rings your phone. Keep the topic name private; anyone who knows it can read the notifications. Change it any time in Supabase → `settings` → key `notifications`.
3. **Deploy on Netlify**: import the GitHub repo, add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (values are in `.env`), deploy. Then point your domain (`taab.co` is unregistered as of 3 Oct 2026) at Netlify and set `VITE_SITE_URL` to it.
4. **Register the domain and handles**: taab.co / taabbeauty.com, @taab.beauty on Instagram, TikTok and Facebook. Trademark search at ipo.gov.pk (class 3 and 35).
5. **Courier account**: open a TCS or Leopards business account for pickups and COD remittance. Confirm the public tracking URLs in `src/lib/shipping.js` still match their websites.
6. **Pixels** (when the ad accounts exist): add `VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`, `VITE_GA_ID` or `VITE_GTM_ID` in Netlify environment variables and redeploy.
7. **Supabase plan**: the free tier pauses a project after 7 days without any request and keeps no backups. A live store receives requests daily, so pausing is unlikely, but move to the Pro plan ($25/month) once orders start; it adds daily backups.

## Running the store every day (until the admin panel)

| Task | Where |
|------|-------|
| See new orders | Phone notification, then Supabase → Table editor → `orders` (customer, address, items in `order_items`) |
| Confirm a bank transfer | `orders` → set `payment_status` to `paid` and `status` to `confirmed` |
| Mark packed / shipped / delivered | Supabase → SQL editor → `select update_order_status('TB-XXXXXX-0000', 'shipped', null, 'TCS', 'TRACKING-CODE');` (statuses: confirmed, processing, packed, shipped, out_for_delivery, delivered, cancelled, returned). Cancel/return automatically puts stock back. The customer sees it on Track Order immediately. |
| Change a price or stock | `products` table → edit `price`, `stock`, or the `variants` JSON for shade stock; set `active` to false to hide a product |
| Add a product | Insert a row in `products` (copy an existing row; `images` can be full URLs of photos uploaded to Supabase Storage) |
| Approve reviews | `reviews` → set `status` to `approved` |
| Read messages / subscribers | `contact_messages`, `newsletter_subscribers` |
| Follow up abandoned carts | View `report_abandoned_checkouts` → WhatsApp the number |
| Notify back-in-stock customers | `stock_alerts` → message them, then fill `notified_at` |
| Change delivery fee / threshold / payment methods | `settings` → keys `shipping` and `store` |
| Weekly numbers | Views `report_daily_sales`, `report_sources`, `report_product_performance`, `report_funnel_daily` |

Note: the SQL editor command runs as the database owner, so no admin login is needed for it. The `update_order_status` function is also what the admin panel will call tomorrow.

## Known limits (by design for day one)

- No automatic SMS/email to customers (needs an SMS gateway or email provider). WhatsApp handoff covers confirmations for now.
- Account page shows only orders placed on that device until phone OTP login is added.
- Product photos are licensed stock placeholders; replace with your own before advertising.
- `rating` and `review_count` on products are the seeded values; they will be recalculated from real reviews once reviews start arriving.

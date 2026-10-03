# Launch checklist · what is done, what you must do, how to run the store day to day

## Done and tested (3 October 2026)

- Storefront: 18 pages, mobile-first (320 to 2560 px), bag, guest checkout, wishlist, compare, search, journal, FAQ, policies.
- Backend: Supabase project `taab-beauty` (Mumbai). Orders are priced, stock-checked and written server-side. Coupons and creator codes validated server-side. Max 5 orders per phone per hour.
- Customer accounts (`/account`): sign up and sign in with email + password, saved delivery details that prefill checkout, and a list of every order placed while signed in. Guest checkout still works without an account.
- Admin panel (`/admin`): dashboard, orders, products, customers, reviews, inbox, coupons and creators, analytics, settings. Same colours and components as the store, works on a phone. Only accounts listed in Settings → Team can open it; the database enforces this, not just the screen.
- Order tracking: by order number + phone, with courier name, tracking code and courier link, expected delivery date, and a WhatsApp link from SMS/WhatsApp messages (`/track-order?id=TB-...&phone=03...`).
- Notifications: every new order and contact message is pushed to your phone through the **ntfy** app (free). Tapping the notification opens that order in the admin panel. Customers can also send you their order summary on WhatsApp in one tap from the confirmation page.
- Growth: creator links (`?ref=creator`) show a banner and auto-apply the creator's code; back-in-stock alerts; abandoned checkouts saved with phone number for follow-up; same-day-dispatch countdown; first-party analytics events; A/B test scaffold; SEO (sitemap, structured data, share image); PWA (add to home screen).

## Before you announce the store (your side)

1. **Deploy on Netlify**: import the GitHub repo, add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (values are in `.env`), deploy. Without them the live site runs on mock data and the admin panel cannot open. Then point your domain (`taab.co` is unregistered as of 3 Oct 2026) at Netlify and set `VITE_SITE_URL` to it.
2. **Sign in to the admin panel** at `<your site>/admin`. Email and first password are in `D:\taab-beauty\.env.supabase.local` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Change the password straight away in Settings → Your password.
3. **Settings → Order notifications**: set "Store address" to the live URL (for example `https://taab.co`) so notification taps open the right site. Install the **ntfy** app (Play Store / App Store), choose "Subscribe to topic" and enter the topic shown on that settings card. Keep the topic private; change it there if it ever leaks.
4. **Password-reset links**: once the live address exists and is yours, open `supabase/config.toml`, set `site_url` to it, add `"<live address>/**"` to `additional_redirect_urls` and run `npx supabase config push` (or do the same in Supabase → Authentication → URL configuration). Until then it points at `localhost`, on purpose: reset links carry a sign-in token, so they must only ever go to a domain you own.
5. **Real information** → send it and it goes live in minutes. Phone, WhatsApp number, email, address, bank account, social links and hours are in `src/config/site.js`. Products, prices, stock and photos are edited in Admin → Products.
6. **Register the domain and handles**: taab.co / taabbeauty.com, @taab.beauty on Instagram, TikTok and Facebook. Trademark search at ipo.gov.pk (class 3 and 35).
7. **Courier account**: open a TCS or Leopards business account for pickups and COD remittance. Confirm the public tracking URLs in `src/lib/shipping.js` still match their websites.
8. **Pixels** (when the ad accounts exist): add `VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`, `VITE_GA_ID` or `VITE_GTM_ID` in Netlify environment variables and redeploy.
9. **Supabase plan**: the free tier pauses a project after 7 days without any request and keeps no backups. A live store receives requests daily, so pausing is unlikely, but move to the Pro plan ($25/month) once orders start; it adds daily backups.

## Running the store every day (Admin panel)

| Task | Where in `/admin` |
|------|-------------------|
| See new orders | Phone notification → tap it, or Orders → Open |
| Confirm a bank transfer | Open the order → Payment → change `pending` to `paid`, then save the status as Confirmed |
| Pack / ship / deliver | Open the order → Update order: the next status is preselected; for Shipped choose the courier and paste the tracking number. The customer sees it on Track Order immediately. |
| Message the customer | Open the order → "Message on WhatsApp", or "Send this update on WhatsApp" next to the save button. The text is already written for that status (confirmed, shipped with tracking link, delivered…). |
| Cancel or return | Open the order → set the status to Cancelled or Returned. Stock goes back automatically. |
| Change price, stock, shades, photos | Products → tap the product. "Hidden" removes it from the store without deleting it. |
| Add a product | Products → Add product. Upload photos or paste image links. |
| Approve reviews | Reviews → Waiting for approval |
| Read contact messages | Inbox → Messages |
| Follow up abandoned checkouts | Inbox → Abandoned checkouts → WhatsApp |
| Tell customers an item is back | Inbox → Back-in-stock requests |
| Newsletter list | Inbox → Newsletter → Export CSV |
| Discount codes and influencer codes | Coupons & creators. A creator name gives the link `/?ref=name`, and their sales show under Analytics → Sources & campaigns. |
| Delivery fee, free-delivery limit, payment methods | Settings |
| Give a team member access | They create an account on the store first, then Settings → Team → Add admin |
| Numbers | Dashboard (today / 7 / 30 / 90 days) and Analytics (daily sales, funnel, sources, products, each with CSV export) |

If you are ever locked out: `npm run create-admin -- you@example.com` from the project folder creates the admin or resets its password (needs the service key in `.env`).

## Known limits (by design for day one)

- No automatic SMS/email to customers (needs an SMS gateway or email provider). The WhatsApp buttons in the order screen cover confirmations for now.
- "Forgot password" emails go through Supabase's built-in mail service, which is meant for testing: it sends only a few emails per hour and may refuse addresses outside the project team. Before relying on it, connect a mail provider (for example Resend) under Supabase → Authentication → SMTP. Until then you can reset a customer's password in Supabase → Authentication → Users.
- New accounts are not asked to confirm their email (so sign-up works without a mail provider). Turn confirmation on in `supabase/config.toml` once SMTP is connected.
- Orders placed as a guest are not attached to an account created later; the customer can always find them on Track Order with the order number and phone.
- Card payments stay off until a payment gateway is integrated; the switch in Settings is locked until then.
- Product photos are licensed stock placeholders; replace with your own before advertising.
- Ratings on the seeded products are sample values; each product's rating is recalculated from approved reviews as soon as a real review is approved for it.

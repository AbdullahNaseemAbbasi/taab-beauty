# Launch checklist · what is done, what you must do, how to run the store day to day

## Live

- Store: **https://nazandco.netlify.app** (Netlify, personal account; deploys from this folder with `netlify deploy --build --prod`). Admin: `/admin`.
- Database: Supabase project `taab-beauty`. On the free plan it pauses after a week with no visits; restore it from the Supabase dashboard if the site ever shows "could not load".

## Launch hardening (28 October 2026, all tested on the live database)

- Stock: an order holds its stock until it is cancelled, returned, refunded or its payment fails; it is then put back exactly once. Reopening an order takes the stock again (or refuses if it has sold out). Coupon use and customer totals follow the same rule.
- **Unpaid orders are cancelled automatically** after the hold time (Settings → Payment, default 48 hours) and their stock goes back on the shelf. The policies and FAQ quote the same number.
- Fake-order protection: Pakistani mobile numbers only, up to 10 of an item, up to 3 orders waiting for the advance per number, limits per number and per connection, and checkout refuses a sample bank account.
- Owner and staff: you are the owner. Staff admins can run orders and products but cannot change payment accounts, notifications or the team.
- Order notifications on your phone no longer contain the customer's name, phone or address (ntfy.sh is a public service); tap one to open the order in the admin panel.
- Empty phone, WhatsApp, address or email are hidden on the site instead of showing sample details. The coupon box at checkout no longer places the order by itself.
- Sharing: product, category and department links show their own photo, name and price on WhatsApp, Facebook, Instagram and X; other pages show the Naz & CO share image (`public/og-image.jpg`).
- Checks: `npm run smoke-test -- --confirm` (86 checks on the live database) and browser checks of every store and admin page on desktop and phone.

## Done and tested (4 October 2026)

- Storefront: Naz & CO with three departments to start (Clothing, Beauty, Appliances, in that order everywhere on the site), 11 categories and 73 sample products. Mobile-first (320 to 2560 px), bag, guest checkout, wishlist, compare, search, FAQ, policies.
- Home page: hero that slides sideways by itself every 4 seconds (one slide per department, each with its photo), every category shown with two product photos, department cards, best sellers, a row per department and a mixed product feed.
- **Everything is managed from the admin panel and shows on the site straight away, without a refresh:** departments, categories, brands, products, prices, stock, sizes, photos, delivery fee, payment accounts, advance percentage, phone, WhatsApp, email, address, social links and the announcement bar.
- **Payment: no cash on delivery.** The customer pays an advance (50% now, changeable in Settings) by bank transfer, Easypaisa or JazzCash and the rest on delivery. Orders wait as "Awaiting advance" until you confirm the payment.
- Policies written for this model: Payment & Advance, Shipping, Returns & Warranty, Privacy, Terms. The percentages and fees in them follow your settings.
- Customer accounts (`/account`), order tracking by order number + phone, coupons and creator codes, back-in-stock alerts, abandoned-checkout follow-up, analytics, SEO, PWA.
- Admin panel (`/admin`): dashboard, orders, products, catalogue, customers, reviews, inbox, coupons, analytics, settings. Works on a phone. New orders appear live and ring your phone through the ntfy app.
- Logo: your N monogram and wordmark as vector in the site colours, with the wordmark changed to "Naz & CO".

## Before you share the link (your side)

1. **Deploy on Netlify**: done (see Live above). To deploy automatically on every push instead, open the project in Netlify → Site configuration → Build & deploy → Link repository and pick this GitHub repo; the two environment variables are already set.
2. **Sign in to the admin panel** at `<your site>/admin`. Email and first password are in `D:\taab-beauty\.env.supabase.local` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Change the password in Settings → Your password.
3. **Settings → Payment**: put in your real bank account, and switch on Easypaisa / JazzCash with your numbers if you use them. Until then checkout says "Online payment is being set up" and nobody can order. Set the advance percentage and the hold time you want.
4. **Settings → Store details**: your phone and WhatsApp numbers (the sample numbers show a red warning), email, address and social links. Empty fields are simply not shown on the site.
5. **Settings → Order notifications**: the store address is already the live URL. Install the **ntfy** app on your phone, subscribe to the topic shown there and press "Send test notification".
6. **Products**: every product, brand, price, specification, warranty line and review on the site is sample data. Replace them in Admin → Products and Admin → Catalogue, or hide them, before customers can order. Reviews, star ratings and the customer quotes on the home page are also samples: showing invented reviews to real customers is misleading, so remove them (Admin → Reviews, and tell the developer to remove the quotes) or replace them with real ones.
7. **Read the policies** (`/payment-policy`, `/returns`, `/shipping-policy`). They are sensible defaults, not your confirmed rules: 48 hours to pay the advance, advance refunded in full if cancelled before dispatch, courier charges deducted if a parcel is refused, 7-day returns, warranty terms. Tell the developer what to change.
8. **Domain**: `nazandco.com` is already registered by someone else (see `docs/01-brand-naming.md` for the free alternatives). After you register one, add it in Netlify → Domain management; the build picks up the new address by itself.
9. **Password-reset emails**: in Supabase → Authentication → URL Configuration set Site URL to `https://nazandco.netlify.app` and add `https://nazandco.netlify.app/**` to the redirect URLs (`supabase/config.toml` already has these values). Connect a mail provider (for example Resend) under Supabase → Authentication → SMTP, because the built-in mail service only sends to the project's team members.
10. **Courier**: open a TCS or Leopards business account that can collect the balance on delivery, and confirm the tracking links in `src/lib/shipping.js`.
11. **Supabase plan**: the free tier keeps no backups. Move to Pro ($25/month) once orders start.
12. **Social accounts**: put your Instagram, Facebook, TikTok and YouTube links in Settings → Store details; they appear in the footer and the Instagram block on the home page. Profile pictures for each platform are in `docs/brand/social/`.

## Running the store every day (Admin panel)

| Task | Where in `/admin` |
|------|-------------------|
| See new orders | They appear live on Orders and Dashboard, and ring your phone. Filter "Awaiting advance". |
| Ask for the advance | Open the order → "Ask for the advance on WhatsApp" (the message with the amount and your account is already written). |
| Confirm an advance | Check your bank or wallet app, then open the order → **Advance received, confirm order**. |
| Pack / ship | Open the order → Update order: choose the courier and paste the tracking number. Book the parcel with the courier to collect the balance. |
| Delivered | Set the status to Delivered: the balance is recorded as paid. (Or press "Balance received" if the customer paid it earlier.) |
| Cancel or return | Set the status to Cancelled or Returned: stock goes back automatically. Refund the advance yourself, then set the payment to Refunded. |
| Advance never arrives | Nothing to do: after the hold time (48 hours by default) the order is cancelled automatically and the stock is released. |
| Add / change a product | Products → Add product. Choose swatches for colours or text buttons for sizes. "Hidden" removes it from the store without deleting it. |
| Add a department or category | Catalogue → Departments / Categories. It appears in the menu, the home page hero and the category grid at once. |
| Add a brand | Catalogue → Brands, then choose it in the product form. |
| Approve reviews | Reviews → Waiting for approval |
| Messages, abandoned checkouts, stock requests, newsletter | Inbox |
| Discount and influencer codes | Coupons & creators |
| Delivery fee, advance %, payment accounts, phone, announcement | Settings |
| Give a team member access | They create an account on the store first, then Settings → Team → Add admin (only the owner can). Staff cannot change payment accounts or notifications. |
| Numbers | Dashboard and Analytics (daily sales with payments received, funnel, sources, products; CSV export) |

If you are ever locked out: `npm run create-admin -- you@example.com` from the project folder creates the admin or resets its password.

## Known limits

- Payments are manual transfers confirmed by you; there is no online card payment and no automatic check of the bank account.
- No automatic SMS or email to customers. The WhatsApp buttons in the order screen cover every step.
- New accounts are not asked to confirm their email (so sign-up works without a mail provider).
- Orders placed as a guest are not attached to an account created later; they can always be found on the Tracking page.
- Product photos are licensed stock placeholders.
- FAQs are stored in the database but have no admin screen yet; policies, the About page and the home-page headings are in the code. Ask the developer to change them.

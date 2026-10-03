# Naz & CO · Multi-department e-commerce for Pakistan

Storefront and admin panel for **Naz & CO**, an online store with many departments (Beauty, Appliances and Clothes to start), built with React 19, Vite, Tailwind CSS v4 and React Router on **Supabase** (Postgres, Auth, Storage, Realtime).

Everything a customer sees comes from the database and can be changed from the admin panel without a deploy: departments, categories, brands, products, prices, stock, delivery fee, payment accounts, the advance percentage, contact details and the announcement bar. The site refreshes by itself when any of these change.

There is **no cash on delivery**. An order is confirmed by an advance payment (50% by default, set in Admin → Settings) and the balance is collected on delivery. Prices, stock, coupons and the advance are all calculated server-side when the order is placed.

Without Supabase keys the same storefront runs on the built-in mock data (the admin panel needs the database).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/ (also writes public/sitemap.xml and robots.txt)
npm run preview
```

## Configure

Copy `.env.example` to `.env`.

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Frontend connection to the database. Empty = mock mode. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-side only, used by `npm run seed`, `create-admin` and `smoke-test`. Never ship to the browser. |
| `VITE_SITE_URL` | Canonical address for SEO tags and links in messages. Empty = the address the site is opened on (on Netlify the build uses the site URL). |
| `VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`, `VITE_GA_ID`, `VITE_GTM_ID` | Vendor tracking (optional; events always reach `window.dataLayer` and the `events` table) |
| `VITE_ANALYTICS_DEBUG` | Log events to the console in production |

The brand name and defaults live in `src/config/site.js`. Contact details, social links, the announcement, payment accounts and the advance percentage are stored in the `settings` table and edited in Admin → Settings; `applyStoreSettings()` merges them into the config when the catalogue loads.

## Database (Supabase)

```bash
npx supabase login                       # once, opens the browser
npx supabase link --project-ref <ref>    # once per machine
npm run db:push                          # applies supabase/migrations/*
npm run seed                             # loads the sample catalogue (idempotent)
npm run seed -- --reset-settings         # also puts the sample payment account and contact details back
```

Schema: `supabase/migrations/` (applied in order). Main tables: settings, departments, categories, brands, concerns, products, product_costs, reviews, faqs, coupons, customers, profiles, admins, orders, order_items, events, newsletter_subscribers, contact_messages, stock_alerts, checkout_sessions.

- Public access is read-only on the catalogue and on four settings keys (`shipping`, `store`, `payments`, `contact`), and insert-only on reviews (forced to pending), events and forms.
- `place_order` prices every line from the database, checks and decrements stock (including sizes and shades), validates the coupon, computes delivery, refuses payment methods that are switched off or have no account, saves the advance amount and leaves the order waiting for the advance.
- `update_order_status` (admins only) changes status and payment and writes both to the order timeline; cancelling or returning puts stock back; delivering an order with the advance paid marks it paid in full.
- `get_order` returns an order only when the phone number matches; `my_orders` lists a signed-in customer's orders.

### Accounts and admin panel

- Customers sign up and sign in on `/account` (Supabase Auth, email + password). Guest checkout needs no account.
- The admin panel lives at `/admin` (lazy-loaded, `noindex`): dashboard, orders, products, catalogue (departments, categories, brands), customers, reviews, inbox, coupons and creators, analytics, settings. Access is decided by the database: `is_admin()` checks the signed-in user against the `admins` table, and every admin policy and function depends on it.
- Create the first admin (or reset its password) with `npm run create-admin -- owner@example.com`. Further admins are added in Settings → Team.
- Photos uploaded in the admin go to the public `product-images` storage bucket; only admins can write to it.
- Auth settings are in `supabase/config.toml` and applied with `npx supabase config push`. Keep `site_url` and the redirect list on domains you own; password-reset links carry a sign-in token.

### Realtime, notifications and reports

- The storefront subscribes to changes on products, categories, departments, brands, settings and reviews and reloads its data; the admin panel subscribes to orders, messages and reviews (new orders pop up without refreshing).
- New orders and contact messages are also pushed to the owner's phone via [ntfy](https://ntfy.sh) (database trigger). The topic is stored in the private `notifications` setting.
- Reports are database views (admin-only): `report_daily_sales`, `report_product_performance`, `report_sources`, `report_funnel_daily`, `report_customers`, `report_abandoned_checkouts`.
- `npm run smoke-test` exercises the whole backend (catalogue, coupons, order placement, advance and balance, refused payment methods, stock, lookups, notifications, RLS, customer sign-up, admin actions) and cleans up after itself.

## Deploy (Netlify)

`netlify.toml` sets the build command and publish folder; `public/_redirects` handles client-side routes. In Netlify add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Site configuration → Environment variables) before the first build; without them the live site runs on mock data and the admin panel cannot open. Then follow `docs/10-launch-checklist.md`.

## Try the demo

- Browse the departments from the menu (`/department/beauty`, `/department/appliances`, `/department/clothes`). Beauty pages show ingredients; appliances show specifications and warranty; clothes have size buttons.
- Add products to the bag, apply code `WELCOME10`, `NAZ500` or creator code `HIRA15`, and place the order. The confirmation page shows the advance to send and the account to send it to.
- Sign in at `/admin`, open the order and press "Advance received, confirm order"; the customer's Track Order page updates at once. Mark it delivered and the balance is recorded as paid.
- Track the sample order `NZ-241001-0211` with phone `0300 1234567`.
- In Admin → Catalogue add a department or rename a category while the store is open in another tab: the menu and home page change without a refresh.
- Land on any page with `?utm_source=instagram&utm_campaign=test&ref=hira`: the creator link shows a banner and auto-applies `HIRA15`, and the order carries the attribution.

## Documentation

| Doc | Contents |
|-----|----------|
| `docs/01-brand-naming.md` | The name, its meaning and the domain checks |
| `docs/02-brand-identity.md` | Strategy, voice, colour, type, logo, imagery rules |
| `docs/03-sitemap-routes.md` | Sitemap, route table, URL conventions, SEO |
| `docs/04-components.md` | Component architecture |
| `docs/05-data-model.md` | Product, order, customer, inventory and event schemas |
| `docs/06-analytics-attribution.md` | Events, attribution, retargeting, A/B testing, metric definitions |
| `docs/07-folder-structure.md` | Folder map |
| `docs/08-design-system.md` | Tokens, components, states, accessibility, performance |
| `docs/09-roadmap.md` | What is built and what comes next |
| `docs/10-launch-checklist.md` | What the owner must do before launch, and daily operations in the admin panel |

## Images

The logo in `src/components/Logo.jsx` draws the paths in `src/components/logoPaths.js`, traced from the owner's artwork (`docs/brand/`) and coloured from the site palette.

Placeholder photography is served from Burst (Shopify's free stock library, licensed for commercial use) through its resizing CDN. Replace it with your own photos in Admin → Products and Admin → Catalogue.

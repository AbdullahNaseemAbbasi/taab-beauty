# TAAB · Premium beauty e-commerce for Pakistan

Data-driven storefront for **TAAB** (makeup, skincare, haircare, fragrance and tools), built with React 19, Vite, Tailwind CSS v4 and React Router, backed by **Supabase** (Postgres). Catalogue, reviews, articles, coupons, orders, customers, forms and analytics events all live in the database; prices, stock and coupons are validated server-side when an order is placed. Without Supabase keys the same frontend runs on the built-in mock data.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview
```

## Configure

Copy `.env.example` to `.env`.

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Frontend connection to the database. Empty = mock mode. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-side only, used by `npm run seed`. Never ship to the browser. |
| `VITE_SITE_URL` | Canonical URL for SEO tags |
| `VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`, `VITE_GA_ID`, `VITE_GTM_ID` | Vendor tracking (optional; events always reach `window.dataLayer` and the `events` table) |
| `VITE_ANALYTICS_DEBUG` | Log events to the console in production |
| `VITE_ONLINE_PAYMENTS`, `VITE_PAYMENT_PROVIDER` | Enable the card payment option |

Brand, contact, WhatsApp, social links and payment methods live in `src/config/site.js`. Shipping threshold, fee and which payment methods are on come from the `settings` table (seeded with free delivery over Rs. 7,000 and a Rs. 250 fee).

## Database (Supabase)

```bash
npx supabase login                       # once, opens the browser
npx supabase link --project-ref <ref>    # once per machine
npm run db:push                          # applies supabase/migrations/*
npm run seed                             # loads the mock catalogue (idempotent)
```

Schema: `supabase/migrations/20261003000001_schema.sql`. Tables: settings, categories, brands, concerns, products, reviews, articles, faqs, coupons, customers, orders, order_items, events, newsletter_subscribers, contact_messages. Public access is read-only on the catalogue and insert-only on reviews (forced to pending), events and forms. Orders are created through the `place_order` function, which prices every line from the database, checks and decrements stock (including shade variants), validates the coupon, computes shipping from `settings`, upserts the customer and stores the attribution snapshot. `get_order` returns an order only when the phone number matches.

To change products, prices or stock before an admin UI exists: edit the rows in the Supabase dashboard (Table editor) or update `src/data/*` and run `npm run seed` again. Day-to-day operations are listed in `docs/10-launch-checklist.md`.

### Notifications and reports

- New orders and contact messages are pushed to the owner's phone via [ntfy](https://ntfy.sh) (database trigger, no account needed). The topic name is stored in the `settings` table under `notifications` and in the gitignored `.env.supabase.local`.
- Customers can send their order summary to the store's WhatsApp from the confirmation page.
- Reports are database views: `report_daily_sales`, `report_product_performance`, `report_sources`, `report_funnel_daily`, `report_customers`, `report_abandoned_checkouts`.
- `node scripts/smoke-test.mjs` exercises the whole backend (catalogue, coupons, order placement, stock, lookups, notifications, RLS) with the public key and cleans up after itself.

## Deploy (Netlify)

`netlify.toml` sets the build command and publish folder; `public/_redirects` handles client-side routes. In Netlify add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Site configuration → Environment variables) before the first build; without them the live site runs on mock data. The contact and newsletter forms write to Supabase when it is configured and fall back to Netlify Forms otherwise.

## Try the demo

- Add products to the bag, apply code `WELCOME10` or creator code `HIRA15`, and check out with cash on delivery. The order is written to Supabase and stock is decremented.
- Track the sample order `TB-241001-0211` with phone `0300 1234567`.
- Land on any page with `?utm_source=instagram&utm_campaign=test&ref=hira` and watch the attribution appear on the events in the console and on the order you place. The `ref=hira` creator link shows a banner and auto-applies `HIRA15` at checkout.
- Open `/track-order?id=TB-241001-0211&phone=03001234567` to see the link format used in SMS and WhatsApp messages.

## Documentation

| Doc | Contents |
|-----|----------|
| `docs/01-brand-naming.md` | 20 name candidates, scoring, final choice, live domain check |
| `docs/02-brand-identity.md` | Strategy, voice, colour, type, logo, imagery rules |
| `docs/03-sitemap-routes.md` | Sitemap, route table, URL conventions, SEO |
| `docs/04-components.md` | Component architecture |
| `docs/05-data-model.md` | Product, order, customer, inventory and event schemas |
| `docs/06-analytics-attribution.md` | Events, attribution, retargeting, A/B testing, dashboards, metric definitions |
| `docs/07-folder-structure.md` | Folder map and backend migration points |
| `docs/08-design-system.md` | Tokens, components, states, accessibility, performance |
| `docs/09-roadmap.md` | Phases from static storefront to full platform |
| `docs/10-launch-checklist.md` | What is done, what the owner must do, daily operations until the admin panel |

## Images

Placeholder photography is served from Burst (Shopify's free stock library, licensed for commercial use) through its resizing CDN. Replace slugs in `src/data/images.js` and the product `images` arrays with your own photography when it is ready.

# TAAB · Premium beauty e-commerce for Pakistan

Static, data-driven storefront for **TAAB** (makeup, skincare, haircare, fragrance and tools), built with React 19, Vite, Tailwind CSS v4 and React Router. Dummy catalogue, working bag, guest checkout, order tracking, wishlist, compare, journal and a complete analytics and attribution layer ready for real tracking IDs.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview
```

## Configure

Copy `.env.example` to `.env`. Tracking IDs are optional; without them every event still flows to `window.dataLayer` and the browser console (open DevTools to watch the funnel fire).

| Variable | Purpose |
|----------|---------|
| `VITE_SITE_URL` | Canonical URL for SEO tags |
| `VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`, `VITE_GA_ID`, `VITE_GTM_ID` | Vendor tracking |
| `VITE_ANALYTICS_DEBUG` | Log events in production |
| `VITE_ONLINE_PAYMENTS`, `VITE_PAYMENT_PROVIDER` | Enable the card payment option |

Brand, contact, WhatsApp, social links, shipping rules and payment methods live in `src/config/site.js`.

## Deploy (Netlify)

`netlify.toml` sets the build command and publish folder; `public/_redirects` handles client-side routes. After the first deploy, enable **Site configuration → Forms → form detection** so the contact and newsletter forms are collected, then trigger one redeploy.

## Try the demo

- Add products to the bag, apply code `WELCOME10` or creator code `HIRA15`, and check out with cash on delivery.
- Track the sample order `TB-241001-0211` with phone `0300 1234567`.
- Land on any page with `?utm_source=instagram&utm_campaign=test&ref=creator123` and watch the attribution appear on the events in the console and on the order you place.

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

## Images

Placeholder photography is served from Burst (Shopify's free stock library, licensed for commercial use) through its resizing CDN. Replace slugs in `src/data/images.js` and the product `images` arrays with your own photography when it is ready.

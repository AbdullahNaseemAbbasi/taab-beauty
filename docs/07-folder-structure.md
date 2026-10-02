# Step 9 · Folder structure

```
taab-beauty/
├── index.html                 Fonts, meta, hidden Netlify forms (fallback), #root
├── netlify.toml               Build command and publish folder
├── .env.example               Supabase keys, tracking IDs, payment flags
├── public/
│   ├── _redirects             SPA fallback for client-side routing
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── supabase/
│   ├── config.toml            Supabase CLI config
│   └── migrations/            SQL schema, functions, RLS (applied with npm run db:push)
├── scripts/
│   └── seed.mjs               Loads src/data into the database (npm run seed)
├── docs/                      This architecture pack
└── src/
    ├── main.jsx               Router → CatalogProvider → StoreProvider → App
    ├── App.jsx                Route table (lazy-loaded pages)
    ├── index.css              Tailwind theme tokens and base styles
    ├── config/
    │   └── site.js            Brand, contact, social, payments, nav (static config)
    ├── api/                   The only modules that talk to Supabase; each falls back to mock data
    │   ├── client.js          createClient() or null; isLive flag
    │   ├── catalog.js         fetchCatalog(), fetchProductBySlug(), submitReview()
    │   ├── orders.js          validateCoupon(), placeOrder(), getOrder(), getMyOrders()
    │   ├── forms.js           subscribeNewsletter(), sendContactMessage()
    │   └── events.js          Batched insert of analytics events
    ├── catalog/
    │   └── CatalogProvider.jsx  Loads the dataset once; useCatalog() exposes products, categories, settings…
    ├── analytics/
    │   ├── events.js          Event names and vendor mapping
    │   ├── tracking.js        initAnalytics(), track(), trackPageView()
    │   ├── attribution.js     UTM / ref capture, first and last touch
    │   ├── ecommerce.js       Typed ecommerce helpers
    │   └── experiments.js     A/B assignment
    ├── data/                  Mock dataset (also the seed source)
    │   ├── images.js          Photo slug map
    │   ├── categories.js · brands.js · concerns.js · products.js · reviews.js · journal.js · faqs.js · policies.js
    │   └── misc.js            Coupons, sample orders, order statuses, cities, Instagram
    ├── lib/
    │   ├── images.js          CDN URL and srcset builders
    │   ├── format.js          Price, date, slug helpers
    │   ├── catalog.js         Search, filter, sort, facets, stock, related, reviews helpers
    │   ├── cart.js            Line enrichment, totals, order hydration (pure functions)
    │   ├── collections.js     New arrivals / best sellers / sale definitions
    │   └── schema.js          JSON-LD builders
    ├── hooks/
    │   └── useSeo.js
    ├── store/
    │   └── StoreProvider.jsx  Cart, wishlist, compare, recent, UI, toasts (localStorage)
    ├── components/
    │   ├── Logo.jsx
    │   ├── ui/                Button, Typography, Form, Feedback, RatingStars, Modal, Navigation, Icons
    │   ├── layout/            Layout, AnnouncementBar, Header, MegaMenu, MobileMenu, SearchOverlay, CartDrawer, Footer, Newsletter, WhatsAppButton
    │   ├── product/           ProductCard, ProductGrid (+Carousel), ProductGallery, ReviewSection, FilterSidebar
    │   ├── commerce/          CartItem, FreeShippingBar, OrderSummary, OrderTimeline
    │   └── sections/          Sections.jsx (hero, headers, grids, banners, feeds)
    └── pages/                 One file per route (18 pages)
```

## Data flow

```
Supabase (Postgres)  ──fetchCatalog()──▶  CatalogProvider  ──useCatalog()──▶  pages & components
        ▲                                                        │
        │ place_order / get_order / validate_coupon (RPC)        │ cart state
        └──────────────────────── api/orders.js ◀──────── StoreProvider
        ▲
        └── events (batched inserts) ◀── analytics/tracking.js ◀── every tracked interaction
```

Mock mode (no Supabase keys): `api/*` return the data in `src/data` and keep orders in localStorage, so the UI code never branches on the data source.

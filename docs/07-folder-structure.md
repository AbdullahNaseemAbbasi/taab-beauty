# Step 9 · Folder structure

```
taab-beauty/
├── index.html                 Fonts, meta, hidden Netlify forms, #root
├── netlify.toml               Build command and publish folder
├── .env.example               Tracking IDs and payment flags
├── public/
│   ├── _redirects             SPA fallback for client-side routing
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── docs/                      This architecture pack
└── src/
    ├── main.jsx               Router + StoreProvider
    ├── App.jsx                Route table
    ├── index.css              Tailwind theme tokens and base styles
    ├── config/
    │   └── site.js            Brand, contact, social, shipping, payments, analytics IDs, nav
    ├── analytics/
    │   ├── events.js          Event names and vendor mapping
    │   ├── tracking.js        initAnalytics(), track(), trackPageView()
    │   ├── attribution.js     UTM / ref capture, first and last touch
    │   ├── ecommerce.js       Typed ecommerce helpers
    │   └── experiments.js     A/B assignment
    ├── data/
    │   ├── images.js          Photo slug map
    │   ├── categories.js      Categories and collections
    │   ├── brands.js
    │   ├── concerns.js
    │   ├── products.js        30 products, variants, related and bundle rules
    │   ├── reviews.js         Reviews and testimonials
    │   ├── journal.js         Articles
    │   ├── faqs.js
    │   ├── policies.js
    │   └── misc.js            Coupons, sample orders, order statuses, cities, Instagram
    ├── lib/
    │   ├── images.js          CDN URL and srcset builders
    │   ├── format.js          Price, date, slug helpers
    │   ├── catalog.js         Search, filter, sort, facets, stock
    │   ├── cart.js            Totals, coupons, order creation and lookup
    │   └── schema.js          JSON-LD builders
    ├── hooks/
    │   └── useSeo.js
    ├── store/
    │   └── StoreProvider.jsx  Cart, wishlist, compare, recent, UI, toasts
    ├── components/
    │   ├── Logo.jsx
    │   ├── ui/                Button, Typography, Form, Feedback, RatingStars, Modal, Navigation, Icons
    │   ├── layout/            Layout, AnnouncementBar, Header, MegaMenu, MobileMenu, SearchOverlay, CartDrawer, Footer, Newsletter, WhatsAppButton
    │   ├── product/           ProductCard, ProductGrid (+Carousel), ProductGallery, ReviewSection, FilterSidebar
    │   ├── commerce/          CartItem, FreeShippingBar, OrderSummary, OrderTimeline
    │   └── sections/          Sections.jsx (hero, headers, grids, banners, feeds)
    └── pages/                 One file per route (18 pages)
```

## Where things will move when the backend arrives

| Today | Tomorrow |
|-------|----------|
| `src/data/products.js` | `GET /api/products` (same shape) |
| `lib/cart.js createOrder()` | `POST /api/orders` (returns the same order object) |
| `lib/cart.js getOrder()` | `GET /api/orders/:id?phone=` |
| Netlify Forms (contact, newsletter) | Keep, or route to the CRM |
| `experiments.js` localStorage assignment | Server-side assignment with the same `useVariant()` API |
| Review form (local state) | `POST /api/reviews` with moderation queue |

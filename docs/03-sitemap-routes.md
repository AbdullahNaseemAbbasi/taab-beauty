# Step 3 and 4 · Sitemap and route architecture

## Sitemap

Departments and categories come from the database (Admin → Catalogue), so this tree shows the seeded ones; adding a department adds its menu entry, home-page slide and page automatically.

```
Home
├── Shop
│   ├── All products                 /shop
│   ├── Department                   /department/:id
│   │   ├── Beauty                   /department/beauty
│   │   │   └── Makeup · Skincare · Haircare · Fragrance & Body · Beauty Tools
│   │   ├── Appliances               /department/appliances
│   │   │   └── Tech & Gadgets · Kitchen & Home
│   │   └── Clothes                  /department/clothes
│   │       └── Women · Men · Kids · Bags & Accessories
│   ├── Category                     /shop/:category
│   ├── New Arrivals                 /new-arrivals
│   └── Best Sellers                 /best-sellers
├── Product detail                   /product/:slug
├── Search                           /search?q=
├── Bag                              /cart
├── Checkout                         /checkout
├── Order confirmation               /order/:id
├── Tracking                         /track-order
├── Wishlist                         /wishlist
├── Compare                          /compare
├── My account                       /account
├── About                            /about
├── Contact                          /contact
├── FAQ                              /faq
├── Payment & Advance Policy         /payment-policy
├── Shipping Policy                  /shipping-policy
├── Returns, Refunds & Warranty      /returns
├── Privacy Policy                   /privacy-policy
├── Terms & Conditions               /terms
├── Admin panel                      /admin/*
└── 404                              *
```

The Sale page and the Journal were removed on 4 October 2026 at the owner's request.

## Route table

| Route | Page component | Data | Index | Notes |
|-------|----------------|------|-------|-------|
| `/` | HomePage | departments, categories, products | yes | Hero that slides sideways every 4 seconds (one slide per department), category collage, department rows, mixed product feed |
| `/shop` | ShopPage (mode=all) | products | yes | Filters live in the query string so they are shareable and trackable |
| `/department/:id` | ShopPage (mode=department) | every category of that department | yes | Unknown ids show the 404 page |
| `/shop/:category` | ShopPage (mode=category) | category + products | yes | Category hero, breadcrumb through its department |
| `/new-arrivals` `/best-sellers` | ShopPage (mode=collection) | collection filter | yes | |
| `/product/:slug` | ProductPage | product, reviews, bundles | yes | Ingredients for beauty; specifications, warranty and size buttons for other departments |
| `/search` | SearchPage | query | no | `search` event with result count |
| `/cart` | CartPage | store | no | Shows the advance and the balance |
| `/checkout` | CheckoutPage | store, payment settings | no | Guest checkout; payment method for the advance; `begin_checkout` → `purchase` |
| `/order/:id` | OrderConfirmationPage | order | no | Advance amount, account to pay into, WhatsApp receipt button |
| `/track-order` | TrackOrderPage | order lookup | yes | Order number + phone; shows payment status |
| `/wishlist` `/compare` | utility pages | store / localStorage | no | |
| `/account` | AccountPage | Supabase Auth, profile, `my_orders()` | no | Sign in, create account, reset password, saved details, order history |
| `/about` `/contact` `/faq` | content pages | settings, faqs | yes | FAQ answers quote the live settings |
| policies | PolicyPage | policies + live settings | yes | Advance percentage and delivery fee are filled in from Admin → Settings |
| `/admin/*` | AdminApp (own layout) | admin API | no | Dashboard, orders, products, catalogue, customers, reviews, inbox, coupons, analytics, settings. Admins only |

`/beauty` redirects to `/department/beauty`.

## URL conventions

- Lowercase, hyphenated, no trailing slashes.
- Products: `/product/<slug>`; slugs are stable and never reused. Department and category ids are fixed once created.
- Filters: `?sub=Lips&brand=Naz%20%26%20CO&concern=dryness&min=1000&max=4000&sale=1&stock=1&sort=price-asc&page=2`
- Campaign landing: any URL plus `?utm_source=instagram&utm_medium=paid_social&utm_campaign=summer_sale&utm_content=video_01` or `?ref=creator123`. Parameters are captured once and then dropped from internal navigation.

## SEO

- Per-page title, description, canonical, Open Graph and Twitter tags via `useSeo`.
- JSON-LD: Organization + WebSite (home), Product + Breadcrumb (product), FAQPage (faq), BreadcrumbList (shop).
- `noindex` on cart, checkout, order, search, wishlist, compare, account and admin.
- `public/sitemap.xml` and `public/robots.txt` are generated before every build (`scripts/sitemap.mjs`) using `VITE_SITE_URL`, or the Netlify site address when that is not set. They are not committed.

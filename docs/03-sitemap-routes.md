# Step 3 and 4 · Sitemap and route architecture

## Sitemap

```
Home
├── Shop
│   ├── All products                 /shop
│   ├── Beauty (department)          /beauty
│   │   ├── Makeup                   /shop/makeup
│   │   ├── Skincare                 /shop/skincare
│   │   ├── Haircare                 /shop/haircare
│   │   ├── Fragrance & Body         /shop/fragrance
│   │   └── Beauty Tools             /shop/tools
│   ├── Electronics                  /shop/electronics
│   ├── Kitchen & Dining             /shop/kitchen
│   ├── New Arrivals                 /new-arrivals
│   ├── Best Sellers                 /best-sellers
│   └── Sale                         /sale
├── Product detail                   /product/:slug
├── Search                           /search?q=
├── Bag                              /cart
├── Checkout                         /checkout
├── Order confirmation               /order/:id
├── Track order                      /track-order
├── Wishlist                         /wishlist
├── Compare                          /compare
├── My account                       /account
├── Journal                          /journal  (?topic=guides|tips|home|skin|ingredients|routines)
│   └── Article                      /journal/:slug
├── About                            /about
├── Contact                          /contact
├── FAQ                              /faq
├── Shipping Policy                  /shipping-policy
├── Returns, Refunds & Warranty      /returns
├── Privacy Policy                   /privacy-policy
├── Terms & Conditions               /terms
└── 404                              *
```

## Route table

| Route | Page component | Data | Index | Notes |
|-------|----------------|------|-------|-------|
| `/` | HomePage | products, articles, testimonials | yes | Hero A/B test, 16 sections |
| `/shop` | ShopPage (mode=all) | products | yes | Filters live in the query string so they are shareable and trackable |
| `/shop/:category` | ShopPage (mode=category) | category + products | yes | Category hero, breadcrumb schema |
| `/beauty` | ShopPage (mode=department) | every category whose `department` is beauty | yes | Electronics and Kitchen are one category each, so their department links go to `/shop/electronics` and `/shop/kitchen` |
| `/new-arrivals` `/best-sellers` `/sale` | ShopPage (mode=collection) | collection filter | yes | |
| `/product/:slug` | ProductPage | product, reviews, bundles | yes | Product + Breadcrumb JSON-LD, sticky mobile add-to-bag |
| `/search` | SearchPage | query | no | `search` event with result count |
| `/cart` | CartPage | store | no | `view_cart` |
| `/checkout` | CheckoutPage | store | no | Guest checkout, `begin_checkout` → `purchase` |
| `/order/:id` | OrderConfirmationPage | local order or sample | no | Bank-transfer instructions when relevant |
| `/track-order` | TrackOrderPage | order lookup | yes | Order number + phone |
| `/wishlist` `/compare` | utility pages | store / localStorage | no | |
| `/account` | AccountPage | Supabase Auth, profile, `my_orders()` | no | Sign in, create account, reset password, saved details, order history |
| `/admin/*` | AdminApp (own layout) | admin API | no | Dashboard, orders, products, customers, reviews, inbox, coupons, analytics, settings. Admins only; disallowed in robots.txt |
| `/journal` `/journal/:slug` | JournalPage, ArticlePage | articles | yes | Article JSON-LD |
| `/about` `/contact` `/faq` | content pages | config, faqs | yes | FAQ JSON-LD, Netlify contact form |
| policies | PolicyPage | policies | yes | |

## URL conventions

- Lowercase, hyphenated, no trailing slashes.
- Products: `/product/<slug>`; slugs are stable and never reused.
- Filters: `?sub=Lips&brand=Naaz%20%26%20CO&concern=dryness&min=1000&max=4000&sale=1&stock=1&sort=price-asc&page=2`
- Campaign landing: any URL plus `?utm_source=instagram&utm_medium=paid_social&utm_campaign=summer_sale&utm_content=foundation_video_01` or `?ref=creator123`. Parameters are captured once and then dropped from internal navigation.

## SEO

- Per-page title, description, canonical, Open Graph and Twitter tags via `useSeo`.
- JSON-LD: Organization + WebSite (home), Product + Breadcrumb (product), Article + Breadcrumb (journal), FAQPage (faq), BreadcrumbList (shop).
- `noindex` on cart, checkout, order, search, wishlist, compare, account.
- Sitemap and robots.txt are generated at build time once the product list comes from the database; today `public/robots.txt` and `public/sitemap.xml` are static.

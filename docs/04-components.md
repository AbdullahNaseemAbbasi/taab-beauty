# Step 5 · Component architecture

Everything is a plain React function component. Props in, JSX out; state lives in the store or in the URL.

## Layout (`src/components/layout`)

| Component | Responsibility |
|-----------|----------------|
| `Layout` | Page frame: announcement bar, header, routed page, footer, overlays, toasts, WhatsApp button. Runs route effects (attribution capture, page_view, scroll reset). |
| `AnnouncementBar` | Free-shipping / promo strip with an A/B variant. |
| `Header` | Sticky header, primary nav, mega menu trigger, search / account / wishlist / bag actions with counts. |
| `MegaMenu` | Five category columns plus a featured tile. |
| `MobileMenu` | Left drawer: category accordions, collections, account shortcuts, WhatsApp. |
| `SearchOverlay` | Top drawer with live suggestions and popular searches. |
| `CartDrawer` | Right drawer: free-shipping progress, line items, checkout. |
| `Footer` | Newsletter block, contact details, link columns, social, payment and courier line. |
| `Newsletter` | Netlify-backed signup, tracked as `newsletter_signup`. |
| `WhatsAppButton` | Floating chat button; exports `whatsappLink()` used across pages. |

## UI primitives (`src/components/ui`)

`Button` / `IconButton` / `buttonClass`, `Eyebrow`, `SectionHeading`, `TextLink`, `Price`, `Badge`, `Field` / `Input` / `Select` / `Textarea` / `Checkbox` / `Radio`, `RatingStars` / `RatingInput`, `Overlay` (drawer/modal), `Breadcrumbs`, `Pagination`, `QuantityStepper`, `Accordion`, `Skeleton` / `ProductCardSkeleton`, `EmptyState` / `ErrorState`, `ToastViewport`, and the icon set in `Icons.jsx`.

## Product (`src/components/product`)

| Component | Responsibility |
|-----------|----------------|
| `ProductCard` | Image with hover swap, badges, wishlist and compare toggles, rating, price, add-to-bag or choose-shade. Fires `select_item`. |
| `ProductGrid` / `ProductCarousel` | Lists; fire `view_item_list` with the list name. |
| `ProductGallery` | Main image plus thumbnails. |
| `ReviewSection` | Rating summary, breakdown bars, review list, review form (`review_submit`). |
| `FilterSidebar` | Category, type, brand, concern, price, availability, sale, rating facets with counts. Used in the desktop sidebar and the mobile drawer. |

## Commerce (`src/components/commerce`)

`CartItem`, `FreeShippingBar`, `OrderSummary` (+ `CouponInput`), `OrderTimeline`.

## Sections (`src/components/sections/Sections.jsx`)

`PageHero`, `PageHeader`, `Section`, `HeroCarousel`, `TrustSignals`, `CategoryCollage`, `DepartmentGrid`, `BrandStrip`, `Testimonials`, `InstagramFeed`, `JournalCard`.

## Pages (`src/pages`)

One file per route; pages compose sections and read data from `src/data` and state from the store. No page talks to analytics vendors directly; they call the helpers in `src/analytics`.

## State (`src/store/StoreProvider.jsx`)

One reducer holds cart lines, coupon, wishlist, compare list, recently viewed and UI flags. Cart, wishlist, compare and recent are persisted to localStorage; UI state is not. Exposed through `useStore()`.

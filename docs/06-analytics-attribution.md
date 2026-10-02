# Step 7 and 8 · Analytics, attribution and marketing architecture

## Principle

The site is a measurement instrument first. Every stage of the customer journey emits one named event through a single function, `track()`, so no vendor code is scattered through components.

```
AD / SOCIAL → LANDING → DISCOVERY → PRODUCT VIEW → ADD TO CART → CHECKOUT → PAYMENT → PURCHASE → DELIVERY → REVIEW → REPEAT
```

## Modules (`src/analytics`)

| File | Purpose |
|------|---------|
| `events.js` | Canonical event names and their Meta / TikTok / GA4 equivalents. |
| `tracking.js` | `initAnalytics()` loads vendor scripts only when IDs exist; `track()` pushes to `window.dataLayer`, forwards to pixels, logs in dev. |
| `attribution.js` | Captures UTM, `ref`, `fbclid`, `gclid`, `ttclid`; stores first touch (localStorage) and last touch (sessionStorage); attaches to every event and to the order. |
| `ecommerce.js` | Typed helpers that build GA4-style payloads from products, carts and orders. |
| `experiments.js` | Sticky A/B assignment per visitor with an `experiment_exposure` event. |

## Event catalogue

`page_view`, `view_item_list`, `select_item`, `view_item`, `search`, `select_category`, `apply_filter`, `add_to_wishlist`, `remove_from_wishlist`, `add_to_compare`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`, `coupon_applied`, `coupon_rejected`, `whatsapp_click`, `contact_form_submit`, `newsletter_signup`, `product_share`, `review_submit`, `track_order`, `experiment_exposure`, `promo_click`, `social_click`.

Every event carries: `session_id`, `source`, `campaign`, `ad_content`, `creator_ref`, `page_path`, `timestamp`, `currency`, plus `items[]` with `item_id`, `item_name`, `item_brand`, `item_category`, `price`, `quantity` where relevant.

## Attribution flow

1. Visitor lands on `/product/velvet-matte-lipstick?utm_source=instagram&utm_medium=paid_social&utm_campaign=summer_sale&utm_content=foundation_video_01`.
2. `captureAttribution()` stores the touch. If no first touch exists it becomes both first and last touch.
3. The visitor browses; each event is stamped with the last-touch campaign.
4. At checkout, `createOrder()` embeds `attribution { sessionId, firstTouch, lastTouch, creatorRef, device }` in the order record.
5. The order record is the join key: ad spend (from Meta/TikTok/Google reports, by campaign and ad content) joins to orders by `utm_campaign` + `utm_content`; creator payouts join by `creatorRef` or coupon `creatorId`.

Questions this answers: which campaign generated this order, which ad, which platform earned the most revenue, which creator produced the most orders, which campaign was actually profitable.

## Vendor configuration

IDs come from environment variables (`VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`, `VITE_GA_ID`, `VITE_GTM_ID`). With GTM set, GA4 and other tags are managed in GTM from the `dataLayer`. Server-side forwarding (Meta Conversions API, TikTok Events API) is added in the order backend using the same event names; dedupe with `event_id = order.id` for purchase.

## Retargeting audiences

Built from the standard pixel events, no extra code:

| Audience | Rule |
|----------|------|
| Viewed, did not buy | `ViewContent` in 30 days AND NOT `Purchase` |
| Carted, did not buy | `AddToCart` in 14 days AND NOT `Purchase` |
| Started checkout, did not buy | `InitiateCheckout` in 7 days AND NOT `Purchase` |
| Purchased (cross-sell) | `Purchase` in 60 days, exclude last 7 |
| Lookalike seed | `Purchase` value top 25% |

## A/B testing

`useVariant("heroHeadline")` returns `A` or `B`, persisted per device, and emits `experiment_exposure`. Live experiments: hero headline, announcement bar copy, product card CTA label. Conversion is measured by joining `experiment_exposure` to `purchase` on `session_id` in the warehouse. Add an experiment by adding a key to `experiments.js`; no component API changes.

## Personalisation hooks

- Recently viewed carousel on home and product pages (`recent` in the store).
- "Frequently bought together" rules per category, to be replaced by co-purchase data.
- Returning-visitor detection: `attribution.first` exists and `session.startedAt` is a new session. Ready for "Welcome back" copy and concern-based recommendations.

## Dashboards (future admin)

### Funnel
Visitors → product views → add to cart → checkout → payment attempt → purchase → delivered → repeat, with conversion rate between every stage, filterable by date, platform, campaign, ad set, ad, product, location, device.

### Product performance
Views, add-to-carts, purchases, revenue, refunds, conversion rate, ad spend attributed, gross profit.

### Ad performance
Spend, impressions, clicks, CTR, CPC, visitors, add to cart, checkout, purchases, revenue, CAC, ROAS, profit.

### Metric definitions
- Revenue = sum of order totals (delivered or confirmed, by setting).
- Gross profit = revenue − product cost.
- Marketing cost = ad spend + creator fees + coupon discounts.
- Contribution profit = gross profit − marketing cost − packaging − shipping cost − payment fees − refunds.
- CAC = marketing cost ÷ new customers.
- ROAS = revenue ÷ ad spend. **ROAS is not profit**; the dashboard shows both.
- AOV = revenue ÷ orders. Repeat rate = customers with ≥ 2 orders ÷ all customers. LTV = average revenue per customer over 12 months.

## Privacy

Analytics is session-based, not name-based. Personal data (name, phone, address) is only sent to the order backend and courier, never to ad platforms except hashed email/phone for Conversions API matching, which is an explicit later decision.

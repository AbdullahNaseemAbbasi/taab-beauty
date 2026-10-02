# Step 10 · Design system

Tokens live in `src/index.css` under `@theme`; components use Tailwind utilities that reference them.

## Colour tokens

`navy`, `navy-800`, `navy-900`, `navy-950`, `coral`, `coral-600`, `coral-100`, `coral-50`, `teal`, `teal-700`, `mint`, `mint-strong`, `cyan`, `sky`, `aqua`, `lavender`, `ink`, `ink-mid`, `ink-light`, `script`, `tint`, `line`, `gold`, `success`, `danger`.

Usage: text is navy or ink; backgrounds alternate white and tint; coral only for the primary action and sale signals; teal for links and secondary actions; success/danger only for status.

## Typography scale

| Role | Font | Size (desktop) | Weight |
|------|------|----------------|--------|
| Hero H1 | display | 58 to 66px | 800 |
| Section H2 | display | 34 to 38px | 800 |
| Card title | display | 18 to 21px | 800 |
| Eyebrow | sans | 12px, 0.22em tracking, uppercase | 700 |
| Body | sans | 15 to 17px, 1.65 line height | 400 |
| UI labels | sans | 13 to 14px | 600 |

Headings end with a full stop. Eyebrows are uppercase and never longer than four words.

## Spacing and shape

- Section padding 56px (mobile) to 80px (desktop).
- Grid gaps 16px mobile, 24px desktop.
- Radius: 999px pills (buttons, badges, chips), 16px cards, 12px images inside cards, 24px promo banners.
- Shadows: `shadow-card` (resting), `shadow-float` (hover, drawers, dialogs).

## Components and states

| Component | States covered |
|-----------|----------------|
| Button | coral, navy, outline, ghost, white, whatsapp; sm/md/lg; disabled; link or button |
| Input / Select / Textarea | default, focus ring, error (aria-invalid + message), disabled, hint |
| Product card | hover image swap, new / sale / best-seller / sold-out badges, wishlisted, compared, variant required |
| Badge | navy, coral, teal, mint, white, gold, muted, success, danger |
| Toast | success, error, optional action link, auto-dismiss |
| Drawer / overlay | right (bag), left (menu, filters), top (search), centre (dialog); Escape closes; body scroll locked |
| Skeleton | product card skeleton for loading states |
| Empty state | icon, title, text, primary and secondary action; used for bag, wishlist, compare, search, orders, addresses |
| Error state | generic fallback with WhatsApp hint |

## Error and edge states implemented

Empty cart, empty wishlist, empty compare, no search results, out of stock (card, product page, variant swatch), low stock warning, order not found, invalid or below-minimum coupon, form validation errors, network failure on forms, 404 page.

## Accessibility

Visible focus rings, labelled icon buttons, `aria-pressed` on toggles, `aria-live` on quantity and status messages, keyboard-closable overlays, semantic landmarks (header, nav, main, footer), alt text on every image slot.

## Performance

Responsive `srcset` on every image, lazy loading below the fold, `fetchpriority=high` on hero images, preconnect to the image CDN and font host, system-font fallbacks, no third-party scripts unless an analytics ID is configured.

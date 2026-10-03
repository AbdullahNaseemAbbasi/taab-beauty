# Step 2 · Brand strategy and visual identity

## Positioning

Naz & CO is a Karachi online store with many departments (beauty, appliances and clothes to start), chosen for Pakistani homes and delivered nationwide. Customers pay part in advance and the rest on delivery.

**Promise:** good things you will be proud to bring home, without the gamble of buying online.
**Proof:** genuine products from authorised sources, honest ingredient lists, specifications and sizes, warranty on appliances, a clear advance-and-balance payment policy, 7-day returns, a human on WhatsApp.

## Personality

| We are | We are not |
|--------|------------|
| Confident, warm, direct | Loud, pushy, salesy |
| Expert without jargon | Clinical or cold |
| Premium through restraint | Luxury through gold foil and gradients |
| A curated house | A marketplace with ten thousand listings |

## Voice

- Short sentences. One idea each.
- Say what a product does and when it fails. "Survives a July baraat" beats "long-lasting"; "charges a phone twice" beats "high capacity".
- Urdu words where they are natural (chai, baraat, champi, roti), never forced.
- No Lorem Ipsum anywhere. Every string on the site is real copy.

## Visual identity

The identity reuses the existing design system (shared with the agency work) so every page is consistent. The owner's logo was adapted to this palette rather than the palette to the logo.

### Colour

| Token | Hex | Role |
|-------|-----|------|
| navy | #072B4B | Headlines, primary dark surfaces, footer, logo outlines |
| coral | #F3685E | Primary call to action, sale badges, logo fills |
| teal | #1F8DA6 | Links, secondary buttons, trust accents |
| cyan | #51DBDF | Highlights on navy |
| mint / sky / lavender / coral-100 | pastels | Icon backgrounds, badges |
| tint | #F3F8FB | Alternate section background |
| gold | #FDAA20 | Star ratings only |

Rule: one coral element per viewport. Coral is the thing to click; everything else is calm.

### Typography

- Display: Plus Jakarta Sans 700/800, tight tracking, sentence case with a full stop.
- Body and UI: Inter 400/500/600.
- Script accent: Caveat, used sparingly for handwritten notes.
- The serif lettering of the logo is artwork, not a web font; it is not used for headings.

### Logo

The owner's logo: a tall serif **N** that flows into a woman's profile with leaves, with the wordmark **Naz & CO** underneath (stacked lockup). The original artwork is a rose-gold 3D render reading "Naaz&CO". For the site it was cut out, the wordmark shortened to the new spelling, and the colours remapped to the palette while keeping the artwork's own highlights and shadows, so it still looks embossed:

| Variant | Letter N, profile and wordmark | Large leaf | Small sprig | Used on |
|---------|-------------------------------|------------|-------------|---------|
| Default | navy | coral | teal | white and tint backgrounds (header, admin sign-in) |
| Light | white / silver | coral | cyan | navy backgrounds (footer, admin sidebar) |

- The wordmark sits under the monogram and is slightly narrower than it (0.8 of its width).
- The monogram alone is used where space is tight (mobile menu) and for the favicon and app icons (on a navy square).
- Files: `src/assets/logo/logo-stacked*.webp` and `logo-mark*.webp`, used by `src/components/Logo.jsx`. They are images made from the supplied picture, so if the designer's original layered file exists, a cleaner version can be rendered from it.

### Imagery

- Real product and texture photography; people shown mid-task (applying, cooking, using), not posing.
- Warm, daylight, minimal props. No heavy filters.
- Current placeholders are licensed stock from Burst (free for commercial use). Replace with the store's own photography before advertising; the slug map in `src/data/images.js` and the product `images` arrays are the only places to touch.

### Layout rules

- 5% side margins up to 1600px, then the page scales on very large screens.
- Alternate white and tint sections. Navy sections for proof and promotions.
- Cards: 16px radius, 1px line border, soft shadow on hover.
- Buttons: full pill, 52px tall; coral for the primary action, navy for commerce actions (add to bag, checkout), teal outline for secondary.

### Avoid

Cheap marketplace density, gradient backgrounds, animated hero text, cartoon icons, pastel-pink everything, decorative clutter.

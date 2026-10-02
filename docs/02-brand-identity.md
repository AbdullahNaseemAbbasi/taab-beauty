# Step 2 · Brand strategy and visual identity

## Positioning

TAAB is a Karachi beauty house that sells makeup, skincare, haircare, fragrance and tools chosen for Pakistani skin tones and Pakistani weather, delivered nationwide with cash on delivery.

**Promise:** radiance without guesswork.
**Proof:** weather-tested formulas, published ingredient lists, shade ranges built for warm and olive undertones, 7-day returns, a human on WhatsApp.

## Personality

| We are | We are not |
|--------|------------|
| Confident, warm, direct | Loud, pushy, salesy |
| Expert without jargon | Clinical or cold |
| Premium through restraint | Luxury through gold foil and gradients |
| Local pride, global standards | Imported-only snobbery |

## Voice

- Short sentences. One idea each.
- Say what a product does and when it fails. "Survives a July baraat" beats "long-lasting".
- Urdu words where they are natural (chai, baraat, champi, dupatta), never forced.
- No Lorem Ipsum anywhere. Every string on the site is real copy.

## Visual identity

The identity reuses the existing design system (shared with the agency work) so every page is consistent.

### Colour

| Token | Hex | Role |
|-------|-----|------|
| navy | #072B4B | Headlines, primary dark surfaces, footer |
| coral | #F3685E | Primary call to action, sale badges, the sun in the logo |
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

### Logo

A rising sun (coral) over a horizon line (navy) with three teal rays, beside the wordmark **TAAB** in Plus Jakarta Sans 800 with 0.18em tracking. Light variant inverts navy to white. Favicon is the mark alone on a navy rounded square.

### Imagery

- Real product and texture photography; people shown mid-ritual (applying, blending), not posing.
- Warm, daylight, minimal props. No heavy filters.
- Current placeholders are licensed stock from Burst (free for commercial use). Replace with brand photography before launch; the slug map in `src/data/images.js` is the only file to touch.

### Layout rules

- 5% side margins up to 1600px, then the page scales on very large screens.
- Alternate white and tint sections. Navy sections for proof (stats) and promotions.
- Cards: 16px radius, 1px line border, soft shadow on hover.
- Buttons: full pill, 52px tall; coral for the primary action, navy for commerce actions (add to bag, checkout), teal outline for secondary.

### Avoid

Cheap marketplace density, gradient backgrounds, animated hero text, cartoon icons, pastel-pink everything, decorative clutter.

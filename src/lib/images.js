/*
 * Image helpers. Photos are served from Burst (Shopify's free stock library,
 * licensed for commercial use) through its resizing CDN, which lets us request
 * exactly the width each slot needs and build responsive srcsets. Replace the
 * slug map in src/data/images.js with real product photography later; nothing
 * else needs to change.
 */
const CDN = "https://burst.shopifycdn.com/photos";

const isUrl = (value) => /^(https?:)?\/\//.test(value) || value.startsWith("/");

/* Accepts a Burst slug or any full image URL (e.g. a photo uploaded to Supabase Storage). */
export function img(slug, width = 1200) {
  if (!slug) return "";
  if (isUrl(slug)) return slug;
  return `${CDN}/${slug}.jpg?width=${width}&format=pjpg&exif=0&iptc=0`;
}

export function srcSet(slug, widths = [400, 640, 960, 1280, 1600]) {
  if (!slug || isUrl(slug)) return undefined;
  return widths.map((w) => `${img(slug, w)} ${w}w`).join(", ");
}

/* Props for a responsive, lazily loaded <img>. */
export function imageProps(slug, { width = 1200, sizes = "100vw", alt = "", eager = false } = {}) {
  return {
    src: img(slug, width),
    srcSet: srcSet(slug),
    sizes,
    alt,
    loading: eager ? "eager" : "lazy",
    decoding: "async",
    fetchPriority: eager ? "high" : "auto",
  };
}

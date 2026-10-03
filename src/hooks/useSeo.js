import { useEffect } from "react";
import { site } from "../config/site.js";
import { img } from "../lib/images.js";
import { images } from "../data/images.js";

const defaultImage = img(images.hero.home, 1200);

/*
 * Sets per-page SEO without a dependency: title, description, canonical URL,
 * Open Graph / Twitter tags and optional JSON-LD structured data. Tags are
 * marked with data-seo so they are replaced on navigation, never duplicated.
 */
function upsertMeta(attr, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
  tag.setAttribute("data-seo", "true");
}

export default function useSeo({ title, description, path = "/", image, type = "website", jsonLd = [], noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${site.name}` : `${site.name} | Clothing, Beauty, Appliances & More, Delivered Across Pakistan`;
    const url = `${site.url}${path}`;
    const desc = description || site.description;
    const shareImage = image || defaultImage;

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", noindex ? "noindex,nofollow" : "index,follow");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:site_name", site.name);
    upsertMeta("property", "og:image", shareImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", shareImage);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    document.head.querySelectorAll('script[data-seo="jsonld"]').forEach((node) => node.remove());
    const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    blocks.filter(Boolean).forEach((block) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seo = "jsonld";
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
    });
  }, [title, description, path, image, type, noindex, JSON.stringify(jsonLd)]);
}

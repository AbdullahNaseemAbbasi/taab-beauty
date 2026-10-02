/*
 * Lightweight A/B testing scaffold. Each experiment has a key and a list of
 * variants; a visitor is assigned once (persisted in localStorage) and the
 * exposure is tracked, so conversions can later be joined to the variant in
 * the analytics warehouse. Add a real experimentation platform later without
 * changing call sites: useVariant() is the only API components use.
 */
import { useMemo } from "react";
import { track } from "./tracking.js";
import { EVENTS } from "./events.js";

export const experiments = {
  heroHeadline: { variants: ["A", "B"], description: "Hero headline wording" },
  freeShippingBanner: { variants: ["A", "B"], description: "Announcement bar copy" },
  productCardCta: { variants: ["A", "B"], description: "Product card button label" },
};

const STORAGE_KEY = "taab:experiments";
const exposed = new Set();

function readAssignments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getVariant(key) {
  const config = experiments[key];
  if (!config || typeof window === "undefined") return "A";
  const assignments = readAssignments();
  let variant = assignments[key];
  if (!variant) {
    variant = config.variants[Math.floor(Math.random() * config.variants.length)];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...assignments, [key]: variant }));
    } catch {
      /* ignore */
    }
  }
  if (!exposed.has(key)) {
    exposed.add(key);
    track(EVENTS.EXPERIMENT_EXPOSURE, { experiment: key, variant });
  }
  return variant;
}

export function useVariant(key) {
  return useMemo(() => getVariant(key), [key]);
}

import { images } from "./images.js";

export const concerns = [
  { id: "dullness", name: "Dull Skin", description: "Bring back the glow.", image: images.concerns.dullness },
  { id: "dryness", name: "Dryness", description: "Deep, lasting hydration.", image: images.concerns.dryness },
  { id: "acne", name: "Acne & Oil", description: "Clear without over-drying.", image: images.concerns.acne },
  { id: "dark-circles", name: "Dark Circles", description: "Brighter, rested eyes.", image: images.concerns["dark-circles"] },
  { id: "pigmentation", name: "Pigmentation", description: "Even out your tone.", image: images.concerns.pigmentation },
  { id: "hair-fall", name: "Hair Fall", description: "Stronger roots, less shedding.", image: images.concerns["hair-fall"] },
];

export const concernById = Object.fromEntries(concerns.map((concern) => [concern.id, concern]));

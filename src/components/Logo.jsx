import { mark, wordmark } from "./logoPaths.js";
import { site } from "../config/site.js";

/*
 * Naz & CO logo: the N monogram (letter, profile and leaves) beside the
 * wordmark. The shapes are the owner's artwork traced to vector and coloured
 * from the site palette; `light` is for navy backgrounds.
 */
const palettes = {
  dark: { n: "#072B4B", figure: "#072B4B", leaf: "#F3685E", sprig: "#1F8DA6", word: "#072B4B" },
  light: { n: "#FFFFFF", figure: "#FFFFFF", leaf: "#F3685E", sprig: "#51DBDF", word: "#FFFFFF" },
};
const layers = ["n", "leaf", "figure", "sprig"];

export default function Logo({ variant = "dark", compact = false, className = "" }) {
  const colors = palettes[variant] || palettes.dark;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox={mark.viewBox} className="h-11 w-auto shrink-0" aria-hidden="true">
        {layers.map((layer) => (
          <path key={layer} d={mark[layer]} fill={colors[layer]} fillRule="evenodd" />
        ))}
      </svg>
      {!compact && (
        <svg viewBox={wordmark.viewBox} className="h-[22px] w-auto shrink-0 sm:h-6" aria-hidden="true">
          <path d={wordmark.fill} fill={colors.word} fillRule="evenodd" />
        </svg>
      )}
      <span className="sr-only">{site.name}</span>
    </span>
  );
}

import stacked from "../assets/logo/logo-stacked.webp";
import stackedLight from "../assets/logo/logo-stacked-light.webp";
import mark from "../assets/logo/logo-mark.webp";
import markLight from "../assets/logo/logo-mark-light.webp";
import { site } from "../config/site.js";

/*
 * Naz & CO logo: the N monogram with the wordmark underneath. The images keep
 * the embossed 3D lighting of the owner's artwork, recoloured to the site
 * palette. `light` is for navy backgrounds; `compact` shows the monogram alone.
 */
const heights = { sm: "h-12", md: "h-[60px] lg:h-[68px]", lg: "h-24" };

export default function Logo({ variant = "dark", compact = false, size = "md", className = "" }) {
  const light = variant === "light";
  const src = compact ? (light ? markLight : mark) : light ? stackedLight : stacked;
  const [width, height] = compact ? [281, 240] : [353, 384];
  return <img src={src} width={width} height={height} alt={site.name} draggable="false" decoding="async" className={`${compact ? "h-11" : heights[size]} w-auto shrink-0 select-none ${className}`} />;
}

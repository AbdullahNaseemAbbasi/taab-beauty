import { Link } from "react-router-dom";
import { formatPrice, discountPercent } from "../../lib/format.js";
import { ArrowIcon } from "./Icons.jsx";

const tones = { navy: "text-navy", teal: "text-teal", cyan: "text-cyan", coral: "text-coral", white: "text-white/80" };

export function Eyebrow({ tone = "teal", className = "", children }) {
  return <p className={`text-[12px] font-bold uppercase tracking-[0.22em] ${tones[tone]} ${className}`}>{children}</p>;
}

export function SectionHeading({ eyebrow, title, subtitle, align = "center", light = false, action, className = "" }) {
  const centered = align === "center";
  return (
    <div className={`${centered ? "text-center" : "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"} ${className}`}>
      <div className={centered ? "" : "max-w-2xl"}>
        {eyebrow && <Eyebrow tone={light ? "cyan" : "teal"}>{eyebrow}</Eyebrow>}
        <h2 className={`mt-3 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-[34px] lg:text-[38px] ${light ? "text-white" : "text-navy"}`}>
          {title}
        </h2>
        {subtitle && <p className={`${centered ? "mx-auto" : ""} mt-3 max-w-[640px] text-[16px] ${light ? "text-white/80" : "text-ink-mid"}`}>{subtitle}</p>}
      </div>
      {action && (
        <TextLink to={action.to} className={centered ? "mt-4 justify-center" : "shrink-0"}>
          {action.label}
        </TextLink>
      )}
    </div>
  );
}

export function TextLink({ to, href, className = "", children, onClick }) {
  const classes = `inline-flex items-center gap-2 text-[15px] font-semibold text-teal transition-colors hover:text-teal-700 ${className}`;
  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {children}
        <ArrowIcon className="size-4" />
      </Link>
    );
  }
  return (
    <a href={href} className={classes} onClick={onClick}>
      {children}
      <ArrowIcon className="size-4" />
    </a>
  );
}

export function Price({ price, compareAtPrice, size = "md", className = "" }) {
  const percent = discountPercent(price, compareAtPrice);
  const sizes = { sm: "text-[15px]", md: "text-[18px]", lg: "text-[26px]" };
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={`font-display font-extrabold text-navy ${sizes[size]}`}>{formatPrice(price)}</span>
      {percent > 0 && (
        <>
          <span className="text-[14px] text-ink-light line-through">{formatPrice(compareAtPrice)}</span>
          <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[12px] font-bold text-coral">-{percent}%</span>
        </>
      )}
    </span>
  );
}

export function Badge({ tone = "navy", className = "", children }) {
  const styles = {
    navy: "bg-navy text-white",
    coral: "bg-coral text-white",
    teal: "bg-teal text-white",
    mint: "bg-mint text-navy",
    white: "bg-white/90 text-navy backdrop-blur-sm",
    gold: "bg-gold text-navy",
    muted: "bg-tint text-ink-mid",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${styles[tone]} ${className}`}>{children}</span>;
}

/* TAAB mark: a rising sun (taab = radiance) over a horizon, plus the wordmark. */
export default function Logo({ variant = "dark", compact = false, className = "" }) {
  const light = variant === "light";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden="true">
        <circle cx="20" cy="23" r="10" fill="#F3685E" />
        <path d="M5 29.5a15 15 0 0 1 30 0" stroke={light ? "#FFFFFF" : "#072B4B"} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M20 3.5v4.5M8.5 8l3.2 3.2M31.5 8l-3.2 3.2" stroke={light ? "#51DBDF" : "#1F8DA6"} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M4 34.5h32" stroke={light ? "#FFFFFF" : "#072B4B"} strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className={`font-display text-[24px] font-extrabold tracking-[0.18em] ${light ? "text-white" : "text-navy"}`}>TAAB</span>
      )}
    </span>
  );
}

import { StarIcon } from "./Icons.jsx";

export default function RatingStars({ rating = 0, count, size = "size-4", showValue = false, className = "" }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} role="img" aria-label={`${rating} out of 5 stars`}>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = rounded >= star ? "text-gold" : rounded >= star - 0.5 ? "text-gold/60" : "text-line";
          return <StarIcon key={star} className={`${size} ${fill}`} />;
        })}
      </span>
      {showValue && <span className="text-[13px] font-semibold text-navy">{rating.toFixed(1)}</span>}
      {count != null && <span className="text-[13px] text-ink-light">({count})</span>}
    </span>
  );
}

export function RatingInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <StarIcon className={`size-7 ${star <= value ? "text-gold" : "text-line"}`} />
        </button>
      ))}
    </div>
  );
}

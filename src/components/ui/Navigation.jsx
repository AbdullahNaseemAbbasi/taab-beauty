import { Link } from "react-router-dom";
import { ChevronRightIcon, ChevronLeftIcon, MinusIcon, PlusIcon } from "./Icons.jsx";

export function Breadcrumbs({ items, className = "" }) {
  return (
    <nav aria-label="Breadcrumb" className={`text-[13px] text-ink-light ${className}`}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-navy">
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.to || item.label} className="flex items-center gap-1.5">
            <ChevronRightIcon className="size-3.5" />
            {index === items.length - 1 || !item.to ? (
              <span className="font-medium text-navy" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="hover:text-navy">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({ page, pageCount, onChange, className = "" }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const base = "grid size-10 place-items-center rounded-full text-[14px] font-semibold transition-colors";
  return (
    <nav aria-label="Pagination" className={`flex items-center justify-center gap-2 ${className}`}>
      <button type="button" aria-label="Previous page" title="Previous page" disabled={page === 1} onClick={() => onChange(page - 1)} className={`${base} border border-line text-navy disabled:opacity-40`}>
        <ChevronLeftIcon className="size-4" />
      </button>
      {pages.map((number) => (
        <button
          key={number}
          type="button"
          aria-current={number === page ? "page" : undefined}
          onClick={() => onChange(number)}
          className={`${base} ${number === page ? "bg-navy text-white" : "border border-line text-navy hover:border-navy"}`}
        >
          {number}
        </button>
      ))}
      <button type="button" aria-label="Next page" title="Next page" disabled={page === pageCount} onClick={() => onChange(page + 1)} className={`${base} border border-line text-navy disabled:opacity-40`}>
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, size = "md", className = "" }) {
  const dims = size === "sm" ? "h-9" : "h-12";
  const btn = size === "sm" ? "w-9" : "w-12";
  return (
    <div className={`inline-flex items-center rounded-full border border-line ${dims} ${className}`} role="group" aria-label="Quantity">
      <button type="button" aria-label="Decrease quantity" title="Decrease quantity" disabled={value <= min} onClick={() => onChange(value - 1)} className={`grid h-full ${btn} place-items-center text-navy disabled:opacity-30`}>
        <MinusIcon className="size-4" />
      </button>
      <span className="min-w-8 text-center text-[15px] font-semibold text-navy" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label="Increase quantity" title="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)} className={`grid h-full ${btn} place-items-center text-navy disabled:opacity-30`}>
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

export function Accordion({ items, defaultOpen = 0, className = "" }) {
  return (
    <div className={`divide-y divide-line rounded-2xl border border-line bg-white ${className}`}>
      {items.map((item, index) => (
        <details key={item.title} open={index === defaultOpen} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[16px] font-semibold text-navy [&::-webkit-details-marker]:hidden">
            {item.title}
            <PlusIcon className="size-4 shrink-0 transition-transform group-open:rotate-45" />
          </summary>
          <div className="px-5 pb-5 text-[15px] leading-[1.7] text-ink">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

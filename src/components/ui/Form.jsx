import { ChevronDownIcon } from "./Icons.jsx";

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-navy outline-none transition-colors placeholder:text-ink-light focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-tint";

export function Field({ label, hint, error, required, htmlFor, className = "", children }) {
  return (
    <label htmlFor={htmlFor} className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-mid">
          {label}
          {required && <span className="text-coral"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-ink-light">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-[12px] font-medium text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

export function Input({ className = "", ...rest }) {
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function Textarea({ className = "", rows = 4, ...rest }) {
  return <textarea rows={rows} className={`${inputClass} resize-y ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }) {
  return (
    <span className="relative block">
      <select className={`${inputClass} appearance-none pr-10 ${className}`} {...rest}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-light" />
    </span>
  );
}

export function Checkbox({ label, className = "", ...rest }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 text-[14px] text-navy ${className}`}>
      <input type="checkbox" className="size-4 rounded border-line accent-coral" {...rest} />
      {label}
    </label>
  );
}

export function Radio({ label, description, className = "", checked, ...rest }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${checked ? "border-coral bg-coral-50/60" : "border-line hover:border-navy/40"} ${className}`}
    >
      <input type="radio" checked={checked} className="mt-1 size-4 accent-coral" {...rest} />
      <span>
        <span className="block text-[15px] font-semibold text-navy">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-ink">{description}</span>}
      </span>
    </label>
  );
}

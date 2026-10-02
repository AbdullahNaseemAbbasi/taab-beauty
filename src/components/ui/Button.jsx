import { Link } from "react-router-dom";
import { ArrowIcon } from "./Icons.jsx";

const variants = {
  coral: "bg-coral text-white hover:bg-coral-600",
  navy: "bg-navy text-white hover:bg-navy-800",
  outline: "border-[1.5px] border-teal text-teal hover:bg-teal/5",
  ghost: "border border-line bg-white text-navy hover:border-navy",
  white: "bg-white text-navy hover:bg-tint",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1fb857]",
};

const sizes = {
  sm: "h-10 px-4 text-[14px] gap-2",
  md: "h-[52px] px-7 text-[15px] gap-2.5",
  lg: "h-14 px-8 text-[16px] gap-3",
};

export function buttonClass({ variant = "coral", size = "md", className = "" } = {}) {
  return `inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`;
}

/* Renders a router Link (to), an anchor (href) or a real <button> (neither). */
export default function Button({ to, href, variant, size, arrow = false, className, children, type = "button", ...rest }) {
  const classes = buttonClass({ variant, size, className });
  const content = (
    <>
      {children}
      {arrow && <ArrowIcon className="size-4" />}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}

export function IconButton({ label, className = "", badge, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative grid size-11 place-items-center rounded-full text-navy transition-colors hover:bg-tint ${className}`}
      {...rest}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

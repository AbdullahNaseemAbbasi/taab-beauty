import { Link } from "react-router-dom";
import Button from "./Button.jsx";
import { CloseIcon, CheckIcon, InfoIcon } from "./Icons.jsx";
import { useStore } from "../../store/StoreProvider.jsx";

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-3">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="mt-4 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-3 h-5 w-1/2" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action, secondary, className = "" }) {
  return (
    <div className={`rounded-2xl border border-dashed border-line bg-tint/60 px-6 py-14 text-center ${className}`}>
      {Icon && (
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-teal shadow-card">
          <Icon className="size-7" />
        </span>
      )}
      <h3 className="mt-5 font-display text-[22px] font-extrabold text-navy">{title}</h3>
      {text && <p className="mx-auto mt-2 max-w-md text-[15px] text-ink">{text}</p>}
      {(action || secondary) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {action && (
            <Button to={action.to} arrow>
              {action.label}
            </Button>
          )}
          {secondary && (
            <Button to={secondary.to} variant="outline">
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong.", text = "Please try again in a moment. If the problem continues, message us on WhatsApp.", action }) {
  return <EmptyState icon={InfoIcon} title={title} text={text} action={action || { label: "Back to home", to: "/" }} />;
}

export function ToastViewport() {
  const { ui, dismissToast } = useStore();
  if (!ui.toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
      {ui.toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-[14px] shadow-float ${
            toast.type === "error" ? "bg-danger text-white" : "bg-navy text-white"
          }`}
        >
          <span className={`grid size-7 shrink-0 place-items-center rounded-full ${toast.type === "error" ? "bg-white/20" : "bg-mint text-navy"}`}>
            {toast.type === "error" ? <InfoIcon className="size-4" /> : <CheckIcon className="size-4" />}
          </span>
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <Link to={toast.action.to} onClick={() => dismissToast(toast.id)} className="font-bold text-cyan underline-offset-2 hover:underline">
              {toast.action.label}
            </Link>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(toast.id)} className="rounded-full p-1 text-white/70 hover:text-white">
            <CloseIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

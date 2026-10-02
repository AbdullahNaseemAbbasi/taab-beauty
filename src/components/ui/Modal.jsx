import { useEffect } from "react";
import { CloseIcon } from "./Icons.jsx";

/* Accessible overlay used for the cart drawer, search, mobile menu and dialogs. */
export default function Overlay({ open, onClose, side = "right", title, children, panelClass = "" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const position = {
    right: "inset-y-0 right-0 h-full w-full max-w-md",
    left: "inset-y-0 left-0 h-full w-full max-w-sm",
    top: "inset-x-0 top-0 w-full",
    center: "left-1/2 top-1/2 w-[calc(100%-32px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl",
  }[side];

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" />
      <div className={`absolute flex flex-col bg-white shadow-float ${position} ${panelClass}`}>
        {title && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-[20px] font-extrabold text-navy">{title}</h2>
            <button type="button" aria-label="Close" onClick={onClose} className="grid size-10 place-items-center rounded-full text-navy hover:bg-tint">
              <CloseIcon className="size-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

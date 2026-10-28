import { useEffect, useRef } from "react";
import { CloseIcon } from "./Icons.jsx";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/*
 * Accessible overlay used for the cart drawer, search, mobile menu and dialogs. Focus moves into the
 * panel when it opens, Tab stays inside it, and focus returns to whatever opened it on close.
 */
export default function Overlay({ open, onClose, side = "right", title, children, panelClass = "" }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const node = panel.current;
    /* Keep a field that focused itself (e.g. the search box); otherwise focus the first control. */
    if (node && !node.contains(document.activeElement)) (node.querySelector(FOCUSABLE) || node).focus({ preventScroll: true });

    const onKey = (event) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((item) => item.offsetParent !== null || item === document.activeElement);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const position = {
    right: "inset-y-0 right-0 h-full w-full max-w-md pb-[var(--host-badge)]",
    left: "inset-y-0 left-0 h-full w-full max-w-sm pb-[var(--host-badge)]",
    top: "inset-x-0 top-0 w-full",
    center: "left-1/2 top-1/2 w-[calc(100%-32px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl",
  }[side];

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" />
      <div ref={panel} tabIndex={-1} className={`absolute flex flex-col bg-white shadow-float outline-none ${position} ${panelClass}`}>
        {title && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-[20px] font-extrabold text-navy">{title}</h2>
            <button type="button" aria-label="Close" title="Close" onClick={onClose} className="grid size-10 place-items-center rounded-full text-navy hover:bg-tint">
              <CloseIcon className="size-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

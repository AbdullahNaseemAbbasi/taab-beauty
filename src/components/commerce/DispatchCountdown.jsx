import { useEffect, useState } from "react";
import { dispatchWindow } from "../../lib/shipping.js";
import { ClockIcon } from "../ui/Icons.jsx";

/* "Order within 2h 15m for same-day dispatch" — refreshes every minute. */
export default function DispatchCountdown({ className = "" }) {
  const [window, setWindow] = useState(() => dispatchWindow());

  useEffect(() => {
    const timer = setInterval(() => setWindow(dispatchWindow()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className={`flex items-center gap-2 text-[13px] text-navy ${className}`}>
      <ClockIcon className="size-4 shrink-0 text-teal" />
      {window.sameDay ? (
        <span>
          Order within <strong>{window.hours > 0 ? `${window.hours}h ` : ""}{window.minutes}m</strong> for same-day dispatch.
        </span>
      ) : (
        <span>Order now and it ships {window.nextLabel} morning.</span>
      )}
    </p>
  );
}

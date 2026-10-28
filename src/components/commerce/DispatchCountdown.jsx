import { useEffect, useState } from "react";
import { dispatchWindow } from "../../lib/shipping.js";
import { ClockIcon } from "../ui/Icons.jsx";

/* "Send your advance within 2h 15m and it ships today" (orders ship once the advance arrives); refreshes every minute. */
export default function DispatchCountdown({ className = "" }) {
  const [slot, setSlot] = useState(() => dispatchWindow());

  useEffect(() => {
    const timer = setInterval(() => setSlot(dispatchWindow()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className={`flex items-center gap-2 text-[13px] text-navy ${className}`}>
      <ClockIcon className="size-4 shrink-0 text-teal" />
      {slot.sameDay ? (
        <span>
          Send your advance within <strong>{slot.hours > 0 ? `${slot.hours}h ` : ""}{slot.minutes}m</strong> and it ships today.
        </span>
      ) : (
        <span>Send your advance today and it ships {slot.nextLabel} morning.</span>
      )}
    </p>
  );
}

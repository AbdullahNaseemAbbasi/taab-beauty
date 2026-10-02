import { formatPrice } from "../../lib/format.js";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { TruckIcon } from "../ui/Icons.jsx";

export default function FreeShippingBar({ remaining }) {
  const { settings } = useCatalog();
  const threshold = settings.shipping.freeShippingThreshold;
  const progress = Math.min(100, Math.round(((threshold - remaining) / threshold) * 100));
  return (
    <div className="rounded-xl bg-tint p-3">
      <p className="flex items-center gap-2 text-[13px] text-navy">
        <TruckIcon className="size-4 shrink-0 text-teal" />
        {remaining > 0 ? (
          <span>
            Add <strong>{formatPrice(remaining)}</strong> more for free delivery.
          </span>
        ) : (
          <span className="font-semibold text-success">You have unlocked free delivery.</span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

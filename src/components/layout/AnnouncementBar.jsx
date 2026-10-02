import { Link } from "react-router-dom";
import { site } from "../../config/site.js";
import { formatPrice } from "../../lib/format.js";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { useVariant } from "../../analytics/experiments.js";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";

export default function AnnouncementBar() {
  const variant = useVariant("freeShippingBanner");
  const { settings } = useCatalog();
  const threshold = formatPrice(settings.shipping.freeShippingThreshold);
  const message =
    variant === "B"
      ? `Order today, delivered in ${settings.shipping.estimatedDays}. Free delivery over ${threshold}.`
      : `Free delivery on orders over ${threshold}. Cash on delivery across Pakistan.`;
  return (
    <div className="bg-navy text-white">
      <div className="wrap flex h-10 items-center justify-center gap-3 text-[13px]">
        <span className="truncate">{message}</span>
        <Link
          to={site.announcement.link.to}
          onClick={() => track(EVENTS.PROMO_CLICK, { promotion_name: "announcement_bar", variant })}
          className="hidden shrink-0 font-semibold text-cyan underline-offset-2 hover:underline sm:inline"
        >
          {site.announcement.link.label}
        </Link>
      </div>
    </div>
  );
}

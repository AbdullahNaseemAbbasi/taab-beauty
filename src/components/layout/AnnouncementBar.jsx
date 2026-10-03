import { Link } from "react-router-dom";
import { site } from "../../config/site.js";
import { formatPrice } from "../../lib/format.js";
import { useCatalog } from "../../catalog/CatalogProvider.jsx";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";

/* The line is set in Admin → Settings; when it is empty it is built from the delivery and advance settings. */
export function announcementText(settings) {
  if (settings.contact.announcement) return settings.contact.announcement;
  const threshold = formatPrice(settings.shipping.freeShippingThreshold);
  const percent = settings.payments.advancePercent;
  const payment = percent >= 100 ? "Pay in advance to confirm your order." : `Pay ${percent}% in advance, the rest on delivery.`;
  return `Free delivery on orders over ${threshold}. ${payment}`;
}

export default function AnnouncementBar() {
  const { settings } = useCatalog();
  return (
    <div className="bg-navy text-white print:hidden">
      <div className="wrap flex h-10 items-center justify-center gap-3 text-[13px]">
        <span className="truncate">{announcementText(settings)}</span>
        <Link
          to={site.announcement.link.to}
          onClick={() => track(EVENTS.PROMO_CLICK, { promotion_name: "announcement_bar" })}
          className="hidden shrink-0 font-semibold text-cyan underline-offset-2 hover:underline sm:inline"
        >
          {site.announcement.link.label}
        </Link>
      </div>
    </div>
  );
}

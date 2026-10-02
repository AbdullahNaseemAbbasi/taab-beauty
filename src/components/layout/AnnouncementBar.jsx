import { Link } from "react-router-dom";
import { site } from "../../config/site.js";
import { useVariant } from "../../analytics/experiments.js";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";

export default function AnnouncementBar() {
  const variant = useVariant("freeShippingBanner");
  const message = variant === "B" ? "Order today, delivered in 2 to 4 days. Free delivery over Rs. 3,000." : site.announcement.message;
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

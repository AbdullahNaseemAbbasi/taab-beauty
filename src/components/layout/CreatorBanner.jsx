import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCreatorRef } from "../../analytics/attribution.js";
import { fetchCreatorOffer } from "../../api/orders.js";
import { track } from "../../analytics/tracking.js";
import { EVENTS } from "../../analytics/events.js";
import { TagIcon, CloseIcon } from "../ui/Icons.jsx";

const DISMISS_KEY = "naaz:creatorBanner:dismissed";

/* Visitors who arrive through a creator link (?ref=name) see that creator's code. */
export default function CreatorBanner() {
  const [offer, setOffer] = useState(null);
  const [hidden, setHidden] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    const ref = getCreatorRef();
    if (!ref || hidden) return;
    fetchCreatorOffer(ref).then((found) => {
      if (!found) return;
      setOffer(found);
      track(EVENTS.CREATOR_OFFER_VIEW, { coupon: found.code, creator_ref: ref });
    });
  }, [hidden]);

  if (!offer || hidden) return null;
  const amount = offer.type === "percent" ? `${offer.value}% off` : offer.type === "fixed" ? `Rs. ${offer.value.toLocaleString()} off` : "free delivery";

  return (
    <div className="bg-coral text-white print:hidden">
      <div className="wrap flex items-center justify-between gap-3 py-2 text-[13px] sm:text-[14px]">
        <p className="flex min-w-0 items-center gap-2">
          <TagIcon className="size-4 shrink-0" />
          <span className="truncate">
            Welcome from <strong className="capitalize">{offer.creatorId}</strong>! Use code <strong>{offer.code}</strong> for {amount}
            {offer.minOrder ? ` on orders over Rs. ${offer.minOrder.toLocaleString()}` : ""}. It is applied automatically at checkout.
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/best-sellers" className="hidden rounded-full bg-white/15 px-3 py-1 font-semibold hover:bg-white/25 sm:inline">
            Shop now
          </Link>
          <button
            type="button"
            aria-label="Dismiss"
            title="Dismiss"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, "1");
              setHidden(true);
            }}
            className="grid size-7 place-items-center rounded-full hover:bg-white/20"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

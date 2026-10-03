/*
 * Marketing attribution.
 *
 * On first load we read UTM parameters, creator refs and ad click ids from the
 * URL and store them in two buckets:
 *   - first touch (localStorage): how this device first discovered the brand
 *   - last touch (sessionStorage): the campaign that brought this visit
 * Both are attached to every tracked event and to the order at checkout, so the
 * business can answer "which ad produced this sale?".
 */
const FIRST_KEY = "naz:attribution:first";
const LAST_KEY = "naz:attribution:last";
const SESSION_KEY = "naz:session";

const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref", // creator / affiliate code, e.g. ?ref=creator123
  "fbclid",
  "gclid",
  "ttclid",
];

function safeGet(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode); attribution simply is not persisted */
  }
}

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function inferSource(params) {
  if (params.utm_source) return params.utm_source;
  if (params.fbclid) return "facebook";
  if (params.gclid) return "google";
  if (params.ttclid) return "tiktok";
  if (params.ref) return "creator";
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace("www.", "");
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook")) return "facebook";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("google")) return "google";
    if (host.includes("reddit")) return "reddit";
    if (host.includes("youtube")) return "youtube";
    return host;
  } catch {
    return "referral";
  }
}

/* Call once when the app boots. Safe to call again on in-app navigation. */
export function captureAttribution(search = typeof window !== "undefined" ? window.location.search : "") {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(search);
  const params = {};
  TRACKED_PARAMS.forEach((key) => {
    const value = query.get(key);
    if (value) params[key] = value;
  });

  const hasCampaignData = Object.keys(params).length > 0;
  const existingLast = safeGet(sessionStorage, LAST_KEY);

  if (hasCampaignData || !existingLast) {
    const touch = {
      ...params,
      source: inferSource(params),
      medium: params.utm_medium || (params.ref ? "creator" : hasCampaignData ? "campaign" : "organic"),
      landingPage: window.location.pathname,
      referrer: document.referrer || "",
      timestamp: new Date().toISOString(),
    };
    safeSet(sessionStorage, LAST_KEY, touch);
    if (!safeGet(localStorage, FIRST_KEY)) safeSet(localStorage, FIRST_KEY, touch);
  }

  if (!safeGet(sessionStorage, SESSION_KEY)) {
    safeSet(sessionStorage, SESSION_KEY, { id: randomId(), startedAt: new Date().toISOString() });
  }
  return getAttribution();
}

export function getAttribution() {
  if (typeof window === "undefined") return { first: null, last: null, session: null };
  return {
    first: safeGet(localStorage, FIRST_KEY),
    last: safeGet(sessionStorage, LAST_KEY),
    session: safeGet(sessionStorage, SESSION_KEY),
  };
}

/* The creator/affiliate code for the current session, if any. */
export function getCreatorRef() {
  const { last, first } = getAttribution();
  return last?.ref || first?.ref || null;
}

/* Compact snapshot stored on the order record. */
export function attributionForOrder() {
  const { first, last, session } = getAttribution();
  return {
    sessionId: session?.id || null,
    firstTouch: first,
    lastTouch: last,
    creatorRef: getCreatorRef(),
    device: typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
  };
}

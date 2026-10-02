/*
 * Single entry point for analytics. Every component calls track() and nothing
 * else. track() pushes a normalized event to window.dataLayer (for Google Tag
 * Manager / GA4) and forwards to the Meta and TikTok pixels when their IDs are
 * configured. In development the events are printed to the console so the
 * funnel can be verified without any vendor account.
 */
import { site } from "../config/site.js";
import { EVENTS, VENDOR_EVENTS } from "./events.js";
import { getAttribution } from "./attribution.js";

const { analytics } = site;
let initialized = false;

function loadScript(src, id) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  script.id = id;
  document.head.appendChild(script);
}

/* Injects vendor scripts only when an ID is present. Nothing loads in dummy mode. */
export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.dataLayer = window.dataLayer || [];

  if (analytics.gtmId) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript(`https://www.googletagmanager.com/gtm.js?id=${analytics.gtmId}`, "gtm-script");
  }

  if (analytics.gaId && !analytics.gtmId) {
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${analytics.gaId}`, "ga-script");
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", analytics.gaId, { send_page_view: false });
  }

  if (analytics.metaPixelId && !window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    loadScript("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel");
    window.fbq("init", analytics.metaPixelId);
  }

  if (analytics.tiktokPixelId && !window.ttq) {
    window.ttq = { queue: [], track: (...args) => window.ttq.queue.push(["track", ...args]), page: () => window.ttq.queue.push(["page"]) };
    loadScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${analytics.tiktokPixelId}&lib=ttq`, "tiktok-pixel");
  }
}

function forwardToVendors(event, payload) {
  const names = VENDOR_EVENTS[event];
  if (!names) return;
  if (window.fbq && analytics.metaPixelId) window.fbq("track", names.meta, payload);
  if (window.ttq && analytics.tiktokPixelId) {
    if (event === EVENTS.PAGE_VIEW) window.ttq.page();
    else window.ttq.track(names.tiktok, payload);
  }
  if (window.gtag && analytics.gaId && !analytics.gtmId) window.gtag("event", names.ga, payload);
}

/* Tracks one event. Attribution and session context are appended automatically. */
export function track(event, payload = {}) {
  if (typeof window === "undefined") return;
  const attribution = getAttribution();
  const record = {
    event,
    ...payload,
    currency: payload.currency || site.currency.code,
    session_id: attribution.session?.id || null,
    source: attribution.last?.source || null,
    campaign: attribution.last?.utm_campaign || null,
    ad_content: attribution.last?.utm_content || null,
    creator_ref: attribution.last?.ref || attribution.first?.ref || null,
    page_path: window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(record);
  forwardToVendors(event, payload);

  if (analytics.debug) {
    // eslint-disable-next-line no-console
    console.debug(`[analytics] ${event}`, record);
  }
  return record;
}

export function trackPageView(path, title) {
  return track(EVENTS.PAGE_VIEW, { page_path: path, page_title: title });
}

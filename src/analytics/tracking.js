/*
 * Single entry point for analytics. Every component calls track() and nothing
 * else. track() pushes a normalized event to window.dataLayer (for Google Tag
 * Manager / GA4) and forwards to the Meta and TikTok pixels when their IDs are
 * configured. In development the events are printed to the console so the
 * funnel can be verified without any vendor account.
 */
import { site } from "../config/site.js";
import { EVENTS, VENDOR_EVENTS } from "./events.js";
import { getAttribution, getCreatorRef } from "./attribution.js";
import { queueEvent } from "../api/events.js";

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

  /* Same queue shape as Meta's official base code (fbevents.js replays `queue` and expects push/_fbq). */
  if (analytics.metaPixelId && !window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    loadScript("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel");
    window.fbq("init", analytics.metaPixelId);
  }

  /* TikTok's official bootstrap: an array of [method, ...args] calls plus the per-pixel `_i` record the SDK looks for. */
  if (analytics.tiktokPixelId && !window.ttq) {
    const id = analytics.tiktokPixelId;
    const ttq = [];
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
    ttq.setAndDefer = (target, method) => {
      target[method] = (...args) => target.push([method, ...args]);
    };
    ttq.methods.forEach((method) => ttq.setAndDefer(ttq, method));
    ttq.instance = (pixel) => {
      const instance = ttq._i[pixel] || [];
      ttq.methods.forEach((method) => ttq.setAndDefer(instance, method));
      return instance;
    };
    const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = { [id]: Object.assign([], { _u: src }) };
    ttq._t = { [id]: Date.now() };
    ttq._o = { [id]: {} };
    window.TiktokAnalyticsObject = "ttq";
    window.ttq = ttq;
    loadScript(`${src}?sdkid=${id}&lib=ttq`, "tiktok-pixel");
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
    event_id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, // for server-side (Conversions API) deduplication later
    ...payload,
    currency: payload.currency || site.currency.code,
    session_id: attribution.session?.id || null,
    source: attribution.last?.source || null,
    campaign: attribution.last?.utm_campaign || null,
    ad_content: attribution.last?.utm_content || null,
    creator_ref: getCreatorRef(),
    /* Page views carry the cleaned path with its query string; other events just the path. */
    page_path: event === EVENTS.PAGE_VIEW && payload.page_path ? payload.page_path : window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(record);
  /* Automated browsers (site tests, scrapers) stay out of the store's numbers and the ad pixels. */
  if (navigator.webdriver) return record;
  forwardToVendors(event, payload);
  queueEvent(record); // first-party copy in the database

  if (analytics.debug) {
    // eslint-disable-next-line no-console
    console.debug(`[analytics] ${event}`, record);
  }
  return record;
}

/* Query parameters that identify a person never go to analytics or ad pixels (e.g. a tracking link with ?phone=). */
const PRIVATE_PARAMS = ["phone", "email", "tel", "name"];

export function cleanPath(path) {
  const [pathname, query = ""] = String(path || "").split("?");
  const params = new URLSearchParams(query);
  PRIVATE_PARAMS.forEach((key) => params.delete(key));
  const rest = params.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}

export function trackPageView(path, title) {
  /* Pixels read the address bar themselves, so private parameters are dropped from it too (without telling the router). */
  if (typeof window !== "undefined") {
    const current = window.location.pathname + window.location.search;
    const cleaned = cleanPath(current);
    if (cleaned !== current) window.history.replaceState(window.history.state, "", cleaned + window.location.hash);
  }
  return track(EVENTS.PAGE_VIEW, { page_path: cleanPath(path), page_title: title });
}

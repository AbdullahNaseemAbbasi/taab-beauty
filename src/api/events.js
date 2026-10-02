/*
 * Persists analytics events to the `events` table so the funnel, product and
 * campaign dashboards can be built from first-party data. Events are batched
 * and flushed every few seconds or when the page is hidden. Failures are
 * swallowed: analytics must never break the storefront.
 */
import { supabase, isLive } from "./client.js";

const queue = [];
let timer = null;
const FLUSH_MS = 3000;
const MAX_BATCH = 25;

function toRow(record) {
  const { event, session_id, page_path, source, campaign, ad_content, creator_ref, value, currency, items, timestamp, ...rest } = record;
  return {
    event,
    session_id,
    page_path,
    source,
    campaign,
    ad_content,
    creator_ref,
    device: typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    value: typeof value === "number" ? value : null,
    currency: currency || null,
    items: items || null,
    payload: Object.keys(rest).length ? rest : null,
    created_at: timestamp,
  };
}

export async function flushEvents() {
  if (!isLive || queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await supabase.from("events").insert(batch);
  } catch {
    /* ignore; analytics is best-effort */
  }
  if (queue.length) scheduleFlush();
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flushEvents();
  }, FLUSH_MS);
}

export function queueEvent(record) {
  if (!isLive) return;
  queue.push(toRow(record));
  if (queue.length >= MAX_BATCH) flushEvents();
  else scheduleFlush();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEvents();
  });
}

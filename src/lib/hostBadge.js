/*
 * Netlify's free plan adds a "Powered by Netlify" badge fixed to the bottom-right corner, above everything on the page.
 * While it is there, --host-badge holds the room it takes, so the sticky add-to-bag bar, drawers and toasts keep their
 * buttons clear of it. Without the badge (another host or a paid plan) the room is 0.
 */
const BADGE_ROOM = "60px";

export function watchHostBadge() {
  const root = document.documentElement;
  const update = () => root.style.setProperty("--host-badge", document.getElementById("nl-badge-frame") ? BADGE_ROOM : "0px");
  new MutationObserver(update).observe(document.body, { childList: true });
  update();
}

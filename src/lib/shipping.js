/* Delivery estimates, dispatch cut-off and courier tracking helpers (Pakistan time). */
import { site } from "../config/site.js";

const KARACHI_TZ = "Asia/Karachi";
const CUTOFF_HOUR = 14; // orders before 2pm ship the same day
const WORKING_DAYS = [1, 2, 3, 4, 5, 6]; // Monday to Saturday

function partsInKarachi(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: KARACHI_TZ, hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday: weekdayIndex, hour: Number(get("hour")) % 24, minute: Number(get("minute")) };
}

/* Returns { sameDay, hours, minutes } describing the current dispatch window. */
export function dispatchWindow(now = new Date()) {
  const { weekday, hour, minute } = partsInKarachi(now);
  const working = WORKING_DAYS.includes(weekday);
  if (working && hour < CUTOFF_HOUR) {
    const totalMinutes = CUTOFF_HOUR * 60 - (hour * 60 + minute);
    return { sameDay: true, hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
  }
  return { sameDay: false, nextLabel: weekday === 6 && hour >= CUTOFF_HOUR ? "Monday" : weekday === 0 ? "Monday" : "tomorrow" };
}

function addBusinessDays(date, days) {
  const result = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) remaining -= 1; // Sunday is not a delivery day
  }
  return result;
}

/* Estimated delivery range for a city, given when the order was (or will be) placed. */
export function estimateDelivery(city, placedAt = new Date()) {
  const placed = new Date(placedAt);
  const { hour, weekday } = partsInKarachi(placed);
  const dispatchDay = addBusinessDays(placed, hour >= CUTOFF_HOUR || weekday === 0 ? 1 : 0);
  const express = site.shipping.expressCities.includes(city);
  const [minDays, maxDays] = express ? [1, 1] : ["Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Hyderabad"].includes(city) ? [2, 3] : [3, 5];
  return { from: addBusinessDays(dispatchDay, minDays), to: addBusinessDays(dispatchDay, maxDays), express };
}

export function formatDeliveryRange({ from, to }) {
  const fmt = (date) => new Intl.DateTimeFormat("en-GB", { timeZone: KARACHI_TZ, weekday: "short", day: "numeric", month: "short" }).format(date);
  return from.toDateString() === to.toDateString() ? fmt(from) : `${fmt(from)} to ${fmt(to)}`;
}

/* Public tracking pages per courier; the customer pastes the tracking code there. */
export const courierTracking = {
  TCS: { name: "TCS", url: "https://www.tcsexpress.com/track/" },
  Leopards: { name: "Leopards Courier", url: "https://www.leopardscourier.com/tracking" },
  "M&P": { name: "M&P", url: "https://www.mulphilog.com/tracking" },
};

export function courierInfo(courier) {
  if (!courier) return null;
  const key = Object.keys(courierTracking).find((name) => courier.toLowerCase().includes(name.toLowerCase()));
  return key ? courierTracking[key] : { name: courier, url: null };
}

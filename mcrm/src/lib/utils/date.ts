import {
  format,
  formatDistanceToNow,
  isToday as fnsIsToday,
  isTomorrow as fnsIsTomorrow,
  isPast as fnsIsPast,
  parseISO,
} from "date-fns";
import { ja } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const JST = "Asia/Tokyo";

/**
 * Normalize input to a Date object.
 */
function toDate(date: Date | string): Date {
  if (typeof date === "string") {
    return parseISO(date);
  }
  return date;
}

/**
 * Format a date in Japanese: "2026年3月6日"
 */
export function formatDate(date: Date | string): string {
  const d = toDate(date);
  return format(d, "yyyy年M月d日", { locale: ja });
}

/**
 * Format a date and time in Japanese: "2026年3月6日 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = toDate(date);
  return format(d, "yyyy年M月d日 HH:mm", { locale: ja });
}

/**
 * Format a relative time string: "3時間前", "5分前", etc.
 */
export function formatRelative(date: Date | string): string {
  const d = toDate(date);
  return formatDistanceToNow(d, { addSuffix: true, locale: ja });
}

/**
 * Check if the date is today (in local timezone).
 */
export function isToday(date: Date | string): boolean {
  return fnsIsToday(toDate(date));
}

/**
 * Check if the date is tomorrow (in local timezone).
 */
export function isTomorrow(date: Date | string): boolean {
  return fnsIsTomorrow(toDate(date));
}

/**
 * Check if the date is in the past.
 */
export function isPast(date: Date | string): boolean {
  return fnsIsPast(toDate(date));
}

/**
 * Get the current date in JST (Asia/Tokyo) timezone.
 */
export function getJSTDate(): Date {
  return toZonedTime(new Date(), JST);
}

/**
 * Locale-aware formatting for the interface.
 *
 * The interface is English-only for now (see AGENTS.md), so every date and number goes
 * through this locale instead of the browser's: a French browser would otherwise mix
 * "lun." into English copy, and the server and client could render different strings.
 * An i18n layer only has to change UI_LOCALE.
 */
import { getDateFormatter, type TimeDisplay } from "./time-display"

export const UI_LOCALE = "en"

const numberFormatter = new Intl.NumberFormat(UI_LOCALE)
const relativeFormatter = new Intl.RelativeTimeFormat(UI_LOCALE, { numeric: "auto" })

const MINUTE_MS = 60 * 1_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatNumber(value: number | null | undefined): string {
	return value == null || !Number.isFinite(value) ? "-" : numberFormatter.format(value)
}

/**
 * `display` carries the visitor's time zone and clock (see `time-display.ts`). Without it
 * the formatter keeps Intl's defaults: the machine's zone and the locale's clock.
 * Formatters are cached, so calling this in a loop is cheap.
 */
export function createDateFormatter(
	options: Intl.DateTimeFormatOptions,
	display?: TimeDisplay
): Intl.DateTimeFormat {
	return getDateFormatter(UI_LOCALE, options, display)
}

export function formatDateTime(
	date: Date,
	options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
	display?: TimeDisplay
): string {
	return createDateFormatter(options, display).format(date)
}

/** "in 3 hours", "tomorrow", "in 5 days": the coarsest unit that still reads naturally. */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
	const diff = date.getTime() - now.getTime()
	const absolute = Math.abs(diff)

	if (absolute < HOUR_MS) {
		return relativeFormatter.format(Math.round(diff / MINUTE_MS), "minute")
	}
	if (absolute < DAY_MS) {
		return relativeFormatter.format(Math.round(diff / HOUR_MS), "hour")
	}
	return relativeFormatter.format(Math.round(diff / DAY_MS), "day")
}

/** Without display settings an airing slot reads as 24-hour, as it always has. */
const DEFAULT_AIRING_DISPLAY: TimeDisplay = { hourCycle: "h23" }

/** A clock time: "13:30" on a 24-hour clock, "1:30 PM" otherwise (no "01:30 PM"). */
export function clockTimeOptions(display?: TimeDisplay): Intl.DateTimeFormatOptions {
	return { hour: display?.hourCycle === "h23" ? "2-digit" : "numeric", minute: "2-digit" }
}

/** An upcoming airing: relative distance, then the exact weekday and time. */
export function formatAiringTime(
	date: Date,
	now: Date = new Date(),
	display: TimeDisplay = DEFAULT_AIRING_DISPLAY
): string {
	const exact = formatDateTime(date, { weekday: "short", ...clockTimeOptions(display) }, display)
	return `${formatRelativeTime(date, now)} · ${exact}`
}

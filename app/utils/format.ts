/**
 * Locale-aware formatting for the interface.
 *
 * The interface is English-only for now (see AGENTS.md), so every date and number goes
 * through this locale instead of the browser's: a French browser would otherwise mix
 * "lun." into English copy, and the server and client could render different strings.
 * An i18n layer only has to change UI_LOCALE.
 */
export const UI_LOCALE = "en"

const numberFormatter = new Intl.NumberFormat(UI_LOCALE)
const relativeFormatter = new Intl.RelativeTimeFormat(UI_LOCALE, { numeric: "auto" })

const MINUTE_MS = 60 * 1_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatNumber(value: number | null | undefined): string {
	return value == null || !Number.isFinite(value) ? "-" : numberFormatter.format(value)
}

export function createDateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	return new Intl.DateTimeFormat(UI_LOCALE, options)
}

export function formatDateTime(
	date: Date,
	options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
): string {
	return createDateFormatter(options).format(date)
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

/** An upcoming airing: relative distance, then the exact weekday and time. */
export function formatAiringTime(date: Date, now: Date = new Date()): string {
	const exact = formatDateTime(date, { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
	return `${formatRelativeTime(date, now)} · ${exact}`
}

import { formatDateTime } from "./format"
import type { TimeDisplay } from "./time-display"

export interface RunTimeFormatOptions {
	/** The compact feed prints the day beside the card, so a same-day span is times only. */
	compact?: boolean
	/** Defaults to the browser's timezone. Fixed in tests. */
	timeZone?: string
	/** The visitor's zone and clock; an explicit `timeZone` wins over its zone. */
	display?: TimeDisplay
}

const TIME_ONLY: Intl.DateTimeFormatOptions = { timeStyle: "short" }
const DATE_AND_TIME: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
const SHORT_DATE_AND_TIME: Intl.DateTimeFormatOptions = {
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit"
}

function withTimeZone(
	display: TimeDisplay | undefined,
	timeZone: string | undefined
): TimeDisplay | undefined {
	return timeZone ? { ...display, timeZone } : display
}

function toDate(seconds: number): Date {
	return new Date(seconds * 1_000)
}

/** True when the two timestamps (in seconds) fall on different calendar days. */
export function runSpansSeveralDays(
	startedAt: number,
	endedAt: number,
	timeZone?: string,
	display?: TimeDisplay
): boolean {
	const day: Intl.DateTimeFormatOptions = { dateStyle: "short" }
	const zoned = withTimeZone(display, timeZone)
	return formatDateTime(toDate(startedAt), day, zoned) !== formatDateTime(toDate(endedAt), day, zoned)
}

/**
 * The time span of a run: "Nov 10, 2026, 8:05 PM – 9:40 PM". Both dates are printed
 * when the run crosses midnight. Timestamps are in seconds, like AniList's `createdAt`.
 */
export function formatRunSpan(
	startedAt: number,
	endedAt: number,
	options: RunTimeFormatOptions = {}
): string {
	const { compact = false, timeZone, display } = options
	const zoned = withTimeZone(display, timeZone)
	const severalDays = runSpansSeveralDays(startedAt, endedAt, timeZone, display)
	const dated = compact ? SHORT_DATE_AND_TIME : DATE_AND_TIME
	const startFormat = compact && !severalDays ? TIME_ONLY : dated
	const endFormat = severalDays ? dated : TIME_ONLY

	const start = formatDateTime(toDate(startedAt), startFormat, zoned)
	const end = formatDateTime(toDate(endedAt), endFormat, zoned)
	return `${start} – ${end}`
}

/** The time of one update inside a run; dated only when the run crosses midnight. */
export function formatRunUpdateTime(
	createdAt: number,
	severalDays: boolean,
	timeZone?: string,
	display?: TimeDisplay
): string {
	return formatDateTime(
		toDate(createdAt),
		severalDays ? SHORT_DATE_AND_TIME : TIME_ONLY,
		withTimeZone(display, timeZone)
	)
}

/** "watched episode" becomes "watched episodes" for a run of several updates. */
export function pluraliseEpisodeStatus(status: string | null): string {
	const verb = status?.trim() ?? ""
	if (!verb) return "episodes"
	return /\bepisode\b/i.test(verb) ? verb.replace(/\bepisode\b/i, "$&s") : `${verb} episodes`
}

import { formatDateTime } from "./format"

export interface RunTimeFormatOptions {
	/** The compact feed prints the day beside the card, so a same-day span is times only. */
	compact?: boolean
	/** Defaults to the browser's timezone. Fixed in tests. */
	timeZone?: string
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
	options: Intl.DateTimeFormatOptions,
	timeZone: string | undefined
): Intl.DateTimeFormatOptions {
	return timeZone ? { ...options, timeZone } : options
}

function toDate(seconds: number): Date {
	return new Date(seconds * 1_000)
}

/** True when the two timestamps (in seconds) fall on different calendar days. */
export function runSpansSeveralDays(
	startedAt: number,
	endedAt: number,
	timeZone?: string
): boolean {
	const day = withTimeZone({ dateStyle: "short" }, timeZone)
	return formatDateTime(toDate(startedAt), day) !== formatDateTime(toDate(endedAt), day)
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
	const { compact = false, timeZone } = options
	const severalDays = runSpansSeveralDays(startedAt, endedAt, timeZone)
	const dated = compact ? SHORT_DATE_AND_TIME : DATE_AND_TIME
	const startFormat = compact && !severalDays ? TIME_ONLY : dated
	const endFormat = severalDays ? dated : TIME_ONLY

	const start = formatDateTime(toDate(startedAt), withTimeZone(startFormat, timeZone))
	const end = formatDateTime(toDate(endedAt), withTimeZone(endFormat, timeZone))
	return `${start} – ${end}`
}

/** The time of one update inside a run; dated only when the run crosses midnight. */
export function formatRunUpdateTime(
	createdAt: number,
	severalDays: boolean,
	timeZone?: string
): string {
	return formatDateTime(
		toDate(createdAt),
		withTimeZone(severalDays ? SHORT_DATE_AND_TIME : TIME_ONLY, timeZone)
	)
}

/** "watched episode" becomes "watched episodes" for a run of several updates. */
export function pluraliseEpisodeStatus(status: string | null): string {
	const verb = status?.trim() ?? ""
	if (!verb) return "episodes"
	return /\bepisode\b/i.test(verb) ? verb.replace(/\bepisode\b/i, "$&s") : `${verb} episodes`
}

import { UI_LOCALE } from "~/utils/format"
import {
	MAX_REWIND_ACTIVITY_PAGES,
	MIN_REWIND_YEAR,
	type RewindAnimeMetric
} from "~/utils/rewind"

/**
 * Display helpers for the Rewind page: they only turn the numbers computed by
 * `buildRewindSummary` into sentences. Nothing here changes how a year is calculated.
 */

export interface RewindDuration {
	value: string
	unit: string
}

export interface RewindHeadlinePart {
	text: string
	/** Figures taken from the summary: the page sets them apart from the connecting words. */
	emphasis: boolean
}

export interface RewindHeadlineInput {
	year: number
	minutesWatched: number
	animeCount: number
	episodesWatched: number
	activityCount: number
}

export type RewindSelectionKind = "highest-rated" | "longest-watch"

const integerFormatter = new Intl.NumberFormat(UI_LOCALE, { maximumFractionDigits: 0 })
const oneDecimalFormatter = new Intl.NumberFormat(UI_LOCALE, { maximumFractionDigits: 1 })

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return count === 1 ? singular : pluralForm
}

function positiveInteger(value: number): number {
	return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/**
 * A watch time as one rounded figure for a headline: minutes under an hour, hours under two
 * days, then days (one decimal under ten days). `null` when nothing was watched.
 */
export function formatRewindDuration(minutes: number): RewindDuration | null {
	const total = positiveInteger(minutes)
	if (total < 1) return null

	if (total < MINUTES_PER_HOUR) {
		return { value: integerFormatter.format(total), unit: plural(total, "minute") }
	}
	if (total < 2 * MINUTES_PER_DAY) {
		const hours = Math.round(total / MINUTES_PER_HOUR)
		return { value: integerFormatter.format(hours), unit: plural(hours, "hour") }
	}

	const days = total / MINUTES_PER_DAY
	const rounded = days < 10 ? Math.round(days * 10) / 10 : Math.round(days)
	return {
		value: (days < 10 ? oneDecimalFormatter : integerFormatter).format(rounded),
		unit: plural(rounded, "day")
	}
}

function text(value: string): RewindHeadlinePart {
	return { text: value, emphasis: false }
}

function figure(value: string): RewindHeadlinePart {
	return { text: value, emphasis: true }
}

/**
 * The one statement that opens a Rewind. It uses the strongest figures the year has and
 * falls back, in order, to episodes, to the number of anime, then to the list updates.
 * An empty array means the year has nothing to say.
 */
export function buildRewindHeadline(input: RewindHeadlineInput): RewindHeadlinePart[] {
	const animeCount = positiveInteger(input.animeCount)
	const episodes = positiveInteger(input.episodesWatched)
	const updates = positiveInteger(input.activityCount)
	const duration = formatRewindDuration(input.minutesWatched)
	const intro = text(`In ${input.year} you `)
	const anime = figure(`${integerFormatter.format(animeCount)} anime`)

	if (animeCount > 0 && duration) {
		return [
			intro,
			text("spent about "),
			figure(`${duration.value} ${duration.unit}`),
			text(" watching "),
			anime,
			text(".")
		]
	}
	if (animeCount > 0 && episodes > 0) {
		return [
			intro,
			text("watched "),
			figure(`${integerFormatter.format(episodes)} ${plural(episodes, "episode")}`),
			text(" across "),
			anime,
			text(".")
		]
	}
	if (animeCount > 0) {
		return [intro, text("watched "), anime, text(".")]
	}
	if (updates > 0) {
		return [
			intro,
			text("updated your list "),
			figure(updates === 1 ? "once" : `${integerFormatter.format(updates)} times`),
			text(".")
		]
	}

	return []
}

/** The sentence under the headline: the highest-rated title and the most-watched genre. */
export function buildRewindSupportingLine(input: {
	topTitle?: string | null
	topGenre?: string | null
}): string | null {
	const title = input.topTitle?.trim() || null
	const genre = input.topGenre?.trim() || null

	if (title && genre) {
		return `${title} was your highest-rated title, and ${genre} your most-watched genre.`
	}
	if (title) return `${title} was your highest-rated title.`
	if (genre) return `${genre} was your most-watched genre.`
	return null
}

/** Shown under the hero when AniList had more activity pages than a Rewind reads. */
export function getRewindTruncationNote(maxPages = MAX_REWIND_ACTIVITY_PAGES): string {
	return `Based on the most recent ${maxPages} activity pages; older updates are not counted.`
}

/** Anime seen in the activity feed but no longer on the list cannot be described. */
export function getRewindUnmatchedNote(animeCount: number, matchedAnimeCount: number): string | null {
	const missing = positiveInteger(animeCount - matchedAnimeCount)
	if (missing < 1) return null

	return missing === 1
		? "1 anime from this year's activity is no longer on your list, so its genres and watch time are not counted."
		: `${integerFormatter.format(missing)} anime from this year's activity are no longer on your list, so their genres and watch time are not counted.`
}

/**
 * A Rewind "selection" is the highest-rated title of the year, or the longest watch when
 * nothing is scored. The label has to say which one it is.
 */
export function getRewindSelectionKind(
	selection: Pick<RewindAnimeMetric, "entry"> | null | undefined
): RewindSelectionKind | null {
	if (!selection) return null
	return (selection.entry.score ?? 0) > 0 ? "highest-rated" : "longest-watch"
}

export function getPreviousRewindYear(year: number): number | null {
	const previous = year - 1
	return Number.isInteger(previous) && previous >= MIN_REWIND_YEAR ? previous : null
}

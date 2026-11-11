import type { AniListScoreFormat } from "~~/shared/types/anilist"

export const SCORE_FORMAT_LABELS: Record<AniListScoreFormat, string> = {
	POINT_100: "Percentage",
	POINT_10_DECIMAL: "10-point decimal",
	POINT_10: "10-point",
	POINT_5: "5-point",
	POINT_3: "Smiley"
}

export const SCORE_FORMAT_DESCRIPTIONS: Record<AniListScoreFormat, string> = {
	POINT_100: "83%",
	POINT_10_DECIMAL: "8.3/10",
	POINT_10: "8/10",
	POINT_5: "4/5",
	POINT_3: "🙂"
}

const SCORE_FORMAT_MAX: Record<AniListScoreFormat, number> = {
	POINT_100: 100,
	POINT_10_DECIMAL: 10,
	POINT_10: 10,
	POINT_5: 5,
	POINT_3: 3
}

const SCORE_FORMAT_SMILEYS = ["😞", "😐", "🙂"] as const
/** Percentages standing for each smiley, chosen so smileys survive a round trip. */
const SMILEY_PERCENTS = [30, 60, 85] as const
const SMILEY_MIN_PERCENT = [0, 40, 70] as const

/** Converts a raw AniList list score (expressed in `sourceFormat`) into a 0-100 percentage. */
export function scoreToPercent(
	rawScore: number | null | undefined,
	sourceFormat: AniListScoreFormat
): number | null {
	if (rawScore == null || rawScore <= 0) return null
	if (sourceFormat === "POINT_3") {
		const step = Math.min(2, Math.max(0, Math.round(rawScore) - 1))
		return SMILEY_PERCENTS[step] ?? null
	}
	const max = SCORE_FORMAT_MAX[sourceFormat]
	return Math.min(100, (rawScore / max) * 100)
}

/** Formats a 0-100 percentage back into the given display format's textual representation. */
export function formatScoreFromPercent(
	percent: number | null | undefined,
	displayFormat: AniListScoreFormat
): string {
	if (percent == null) return "—"

	const max = SCORE_FORMAT_MAX[displayFormat]
	const scaled = (percent / 100) * max
	// A scored entry never reads as zero once rounded to a coarser scale.
	const steps = Math.min(max, Math.max(1, Math.round(scaled)))

	switch (displayFormat) {
		case "POINT_100":
			return `${steps}%`
		case "POINT_10_DECIMAL":
			return `${Math.min(10, Math.max(0.1, scaled)).toFixed(1)}/10`
		case "POINT_10":
			return `${steps}/10`
		case "POINT_5":
			return `${steps}/5`
		case "POINT_3":
			if (percent >= SMILEY_MIN_PERCENT[2]) return SCORE_FORMAT_SMILEYS[2]
			if (percent >= SMILEY_MIN_PERCENT[1]) return SCORE_FORMAT_SMILEYS[1]
			return SCORE_FORMAT_SMILEYS[0]
	}
}

/**
 * Formats a mean score held on AniList's 0-100 scale, unit included.
 *
 * A mean of zero means no entry was scored, so it reads as a dash instead of
 * being rounded up to the lowest step of the display format.
 */
export function formatMeanScore(
	meanPercent: number | null | undefined,
	displayFormat: AniListScoreFormat
): string {
	if (meanPercent == null || !Number.isFinite(meanPercent) || meanPercent <= 0) return "—"
	return formatScoreFromPercent(Math.min(100, meanPercent), displayFormat)
}

/**
 * Formats a chart axis tick held on the 0-100 scale, unit included.
 *
 * Unlike a score, a tick can sit at zero or between two steps of a coarse scale, so it is
 * never clamped to the lowest step and keeps one decimal when it falls between steps.
 */
export function formatScoreAxisTick(
	percent: number | null | undefined,
	displayFormat: AniListScoreFormat
): string {
	if (percent == null || !Number.isFinite(percent)) return ""

	const clamped = Math.min(100, Math.max(0, percent))
	const scaled = (clamped / 100) * SCORE_FORMAT_MAX[displayFormat]

	switch (displayFormat) {
		case "POINT_100":
			return `${Math.round(scaled)}%`
		case "POINT_10_DECIMAL":
			return `${scaled.toFixed(1)}/10`
		case "POINT_10":
			return `${Number(scaled.toFixed(1))}/10`
		case "POINT_5":
			return `${Number(scaled.toFixed(1))}/5`
		case "POINT_3":
			return clamped <= 0 ? "" : formatScoreFromPercent(clamped, displayFormat)
	}
}

/** Formats a personal AniList list score stored in `sourceFormat` for display in `displayFormat`. */
export function formatPersonalScore(
	rawScore: number | null | undefined,
	sourceFormat: AniListScoreFormat,
	displayFormat: AniListScoreFormat
): string {
	return formatScoreFromPercent(scoreToPercent(rawScore, sourceFormat), displayFormat)
}

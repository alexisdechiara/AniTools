const DETAIL_FIELDS = ["description", "externalLinks", "rankings", "trailer", "studios"] as const

/**
 * True when a media object already carries everything the details views render, so no extra
 * AniList request is needed. `null` counts as present: it is AniList's answer, not a gap.
 */
export function hasMediaDetails(media: unknown): boolean {
	if (typeof media !== "object" || media === null) return false
	const record = media as Record<string, unknown>
	return DETAIL_FIELDS.every(field => record[field] !== undefined)
}

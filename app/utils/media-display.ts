import type { AniListTitleLanguage } from "~~/shared/types/anilist"

/**
 * Structural shapes read by the display helpers. Every AniList media variant (full summary, list
 * summary, calendar and tier list media) satisfies them, so call sites never need to convert.
 */
export interface MediaTitleLike {
	english?: string | null
	native?: string | null
	romaji?: string | null
	userPreferred?: string | null
}

export interface MediaCoverLike {
	extraLarge?: string | null
	large?: string | null
	medium?: string | null
}

export interface MediaDisplayLike {
	id?: number | null
	title?: MediaTitleLike | null
	coverImage?: MediaCoverLike | null
	description?: string | null
}

export type MediaCoverSize = "large" | "medium" | "small"

type TitleField = keyof MediaTitleLike

const DEFAULT_TITLE_ORDER: readonly TitleField[] = ["userPreferred", "english", "romaji", "native"]

function nonEmpty(value: string | null | undefined): string | null {
	if (typeof value !== "string") return null
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}

function languageField(language: AniListTitleLanguage | null | undefined): TitleField | null {
	if (!language) return null
	if (language.startsWith("ENGLISH")) return "english"
	if (language.startsWith("ROMAJI")) return "romaji"
	if (language.startsWith("NATIVE")) return "native"
	return null
}

/**
 * The title to show for an anime. The field matching `language` comes first, then AniList's
 * `userPreferred`, `english`, `romaji` and `native`. Empty and whitespace-only values count as
 * missing. Without any title, falls back to "Anime #<id>" (or "Untitled anime" without an id).
 */
export function getMediaTitle(
	media: Pick<MediaDisplayLike, "id" | "title"> | null | undefined,
	language?: AniListTitleLanguage | null
): string {
	const title = media?.title
	if (title) {
		const preferred = languageField(language)
		const order = preferred ? [preferred, ...DEFAULT_TITLE_ORDER] : DEFAULT_TITLE_ORDER
		for (const field of order) {
			const value = nonEmpty(title[field])
			if (value) return value
		}
	}

	return typeof media?.id === "number" ? `Anime #${media.id}` : "Untitled anime"
}

/**
 * The cover URL to show. `"large"` prefers the biggest image (extraLarge, large, medium),
 * `"medium"` a mid-size one for thumbnails (large, medium, extraLarge) and `"small"` the smallest
 * one (medium, large, extraLarge). Returns `null` when the media has no cover.
 */
export function getMediaCover(
	media: Pick<MediaDisplayLike, "coverImage"> | null | undefined,
	size: MediaCoverSize = "large"
): string | null {
	const cover = media?.coverImage
	if (!cover) return null

	const order = size === "small"
		? [cover.medium, cover.large, cover.extraLarge]
		: size === "medium"
			? [cover.large, cover.medium, cover.extraLarge]
			: [cover.extraLarge, cover.large, cover.medium]

	for (const url of order) {
		const value = nonEmpty(url)
		if (value) return value
	}
	return null
}

const HTML_ENTITIES: Record<string, string> = {
	amp: "&", apos: "'", gt: ">", hellip: "…", lt: "<", ldquo: "“", lsquo: "‘",
	mdash: "—", nbsp: " ", ndash: "–", quot: "\"", rdquo: "”", rsquo: "’"
}

// AniList descriptions arrive HTML-encoded: strip tags, then render entities as their characters.
function decodeHtmlEntities(value: string): string {
	return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith("#")) {
			const codePoint = entity[1]?.toLowerCase() === "x"
				? Number.parseInt(entity.slice(2), 16)
				: Number.parseInt(entity.slice(1), 10)
			return Number.isFinite(codePoint) && codePoint > 0 ? String.fromCodePoint(codePoint) : match
		}
		return HTML_ENTITIES[entity.toLowerCase()] ?? match
	})
}

/**
 * Turns an AniList HTML description into plain text: line breaks become spaces, tags are
 * stripped, entities are decoded and whitespace is collapsed.
 */
export function sanitizeMediaDescription(html: string | null | undefined): string {
	if (!html) return ""
	const withoutTags = html
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/(<([^>]+)>)/gi, "")
	return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim()
}

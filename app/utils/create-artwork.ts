import type {
	AniListAnimeListEntry,
	AniListMediaSummary
} from "~~/shared/types/anilist"
import { getEntryWatchMinutes } from "~/utils/statistics"

export const CREATE_PRESET_IDS = [
	"story",
	"square",
	"anilist-thumbnail",
	"banner"
] as const

export const CREATE_EXPORT_FORMATS = ["png", "jpeg", "webp"] as const
export const CREATE_CONTENT_IDS = [
	"anime",
	"best-rated",
	"flop",
	"most-popular",
	"longest-watch",
	"most-rewatched",
	"favourite"
] as const
export const CREATE_TITLE_LANGUAGE_IDS = [
	"userPreferred",
	"english",
	"romaji",
	"native"
] as const
export const CREATE_IMAGE_SOURCE_IDS = ["cover", "banner"] as const
export const CREATE_FONT_IDS = ["sans", "serif", "display", "mono"] as const

export type CreatePresetId = typeof CREATE_PRESET_IDS[number]
export type CreateExportFormat = typeof CREATE_EXPORT_FORMATS[number]
export type CreateContentId = typeof CREATE_CONTENT_IDS[number]
export type CreateTitleLanguage = typeof CREATE_TITLE_LANGUAGE_IDS[number]
export type CreateImageSource = typeof CREATE_IMAGE_SOURCE_IDS[number]
export type CreateFontId = typeof CREATE_FONT_IDS[number]

export interface CreatePreset {
	id: CreatePresetId
	label: string
	description: string
	width: number
	height: number
	icon: string
}

export interface CoverCrop {
	sourceX: number
	sourceY: number
	sourceWidth: number
	sourceHeight: number
}

export interface CreateContentOption {
	id: CreateContentId
	label: string
	subtitle: string
	icon: string
}

export interface CreateFontOption {
	id: CreateFontId
	label: string
	family: string
}

export const CREATE_CONTENT_OPTIONS: readonly CreateContentOption[] = [
	{
		id: "anime",
		label: "Choose an anime",
		subtitle: "Created with AniTools",
		icon: "i-lucide-search"
	},
	{
		id: "best-rated",
		label: "Best rated",
		subtitle: "Best rated anime",
		icon: "i-lucide-trophy"
	},
	{
		id: "flop",
		label: "Flop",
		subtitle: "Lowest rated anime",
		icon: "i-lucide-trending-down"
	},
	{
		id: "most-popular",
		label: "Most popular",
		subtitle: "Most popular anime",
		icon: "i-lucide-flame"
	},
	{
		id: "longest-watch",
		label: "Longest watch",
		subtitle: "Longest watch time",
		icon: "i-lucide-timer"
	},
	{
		id: "most-rewatched",
		label: "Most rewatched",
		subtitle: "Most rewatched anime",
		icon: "i-lucide-repeat-2"
	},
	{
		id: "favourite",
		label: "Favourite",
		subtitle: "Favourite anime",
		icon: "i-lucide-heart"
	}
]

export const CREATE_TITLE_LANGUAGE_OPTIONS = [
	{ value: "userPreferred", label: "AniList preference" },
	{ value: "english", label: "English" },
	{ value: "romaji", label: "Romaji" },
	{ value: "native", label: "Native" }
] as const

export const CREATE_IMAGE_SOURCE_OPTIONS = [
	{ value: "cover", label: "Cover" },
	{ value: "banner", label: "Banner" }
] as const

export const CREATE_FONTS: Readonly<Record<CreateFontId, CreateFontOption>> = {
	sans: {
		id: "sans",
		label: "Public Sans",
		family: '"Public Sans", ui-sans-serif, system-ui, sans-serif'
	},
	serif: {
		id: "serif",
		label: "Editorial Serif",
		family: "Georgia, Cambria, 'Times New Roman', serif"
	},
	display: {
		id: "display",
		label: "Display",
		family: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
	},
	mono: {
		id: "mono",
		label: "Mono",
		family: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', monospace"
	}
}

export const CREATE_PRESETS: Readonly<Record<CreatePresetId, CreatePreset>> = {
	story: {
		id: "story",
		label: "Story",
		description: "Vertical social story",
		width: 1080,
		height: 1920,
		icon: "i-lucide-smartphone"
	},
	square: {
		id: "square",
		label: "Square",
		description: "Square social post",
		width: 1080,
		height: 1080,
		icon: "i-lucide-square"
	},
	"anilist-thumbnail": {
		id: "anilist-thumbnail",
		label: "AniList thumbnail",
		description: "Landscape social preview",
		width: 1200,
		height: 630,
		icon: "i-lucide-rectangle-horizontal"
	},
	banner: {
		id: "banner",
		label: "Banner",
		description: "Wide profile or community banner",
		width: 1500,
		height: 500,
		icon: "i-lucide-gallery-horizontal-end"
	}
}

export function getCreatePreset(id: CreatePresetId): CreatePreset {
	return CREATE_PRESETS[id]
}

export function getCreateFont(id: CreateFontId): CreateFontOption {
	return CREATE_FONTS[id]
}

function getFallbackTitle(media: AniListMediaSummary): string {
	return media.title?.userPreferred
		?? media.title?.english
		?? media.title?.romaji
		?? media.title?.native
		?? `Anime ${media.id}`
}

export function getCreateMediaTitle(
	media: AniListMediaSummary,
	language: CreateTitleLanguage
): string {
	return media.title?.[language] ?? getFallbackTitle(media)
}

export function getCreateMediaImage(
	media: AniListMediaSummary,
	source: CreateImageSource
): string | null {
	if (source === "banner") return media.bannerImage

	return media.coverImage?.extraLarge
		?? media.coverImage?.large
		?? media.coverImage?.medium
		?? null
}

function getEntryTitle(entry: AniListAnimeListEntry): string {
	return entry.media ? getFallbackTitle(entry.media) : `Anime ${entry.id}`
}

function sortByTitleThenId(
	left: AniListAnimeListEntry,
	right: AniListAnimeListEntry
): number {
	return getEntryTitle(left).localeCompare(getEntryTitle(right))
		|| left.id - right.id
}

export function selectCreateContentEntry(
	entries: readonly AniListAnimeListEntry[],
	content: CreateContentId
): AniListAnimeListEntry | null {
	return selectCreateContentEntries(entries, content, 1)[0] ?? null
}

export function selectCreateContentEntries(
	entries: readonly AniListAnimeListEntry[],
	content: CreateContentId,
	limit = 10
): AniListAnimeListEntry[] {
	const withMedia = entries.filter(
		(entry): entry is AniListAnimeListEntry & { media: AniListMediaSummary } =>
			entry.media != null
	)
	const safeLimit = Math.max(0, Math.floor(limit))

	switch (content) {
		case "anime":
			return []
		case "best-rated":
			return withMedia.toSorted((left, right) =>
				(right.score ?? 0) - (left.score ?? 0)
				|| getEntryWatchMinutes(right) - getEntryWatchMinutes(left)
				|| sortByTitleThenId(left, right)
			).slice(0, safeLimit)
		case "flop":
			return withMedia
				.filter(entry => (entry.score ?? 0) > 0)
				.toSorted((left, right) =>
					(left.score ?? 0) - (right.score ?? 0)
					|| sortByTitleThenId(left, right)
				).slice(0, safeLimit)
		case "most-popular":
			return withMedia.toSorted((left, right) =>
				(right.media.popularity ?? 0) - (left.media.popularity ?? 0)
				|| (right.score ?? 0) - (left.score ?? 0)
				|| sortByTitleThenId(left, right)
			).slice(0, safeLimit)
		case "longest-watch":
			return withMedia.toSorted((left, right) =>
				getEntryWatchMinutes(right) - getEntryWatchMinutes(left)
				|| (right.progress ?? 0) - (left.progress ?? 0)
				|| sortByTitleThenId(left, right)
			).slice(0, safeLimit)
		case "most-rewatched":
			return withMedia.toSorted((left, right) =>
				(right.repeat ?? 0) - (left.repeat ?? 0)
				|| getEntryWatchMinutes(right) - getEntryWatchMinutes(left)
				|| sortByTitleThenId(left, right)
			).slice(0, safeLimit)
		case "favourite":
			return withMedia
				.filter(entry => entry.media.isFavourite)
				.toSorted((left, right) =>
					(right.score ?? 0) - (left.score ?? 0)
					|| getEntryWatchMinutes(right) - getEntryWatchMinutes(left)
					|| sortByTitleThenId(left, right)
				).slice(0, safeLimit)
	}
}

export function calculateCoverCrop(
	sourceWidth: number,
	sourceHeight: number,
	targetWidth: number,
	targetHeight: number,
	zoom = 1,
	positionX = 0.5,
	positionY = 0.5
): CoverCrop {
	if (
		sourceWidth <= 0
		|| sourceHeight <= 0
		|| targetWidth <= 0
		|| targetHeight <= 0
	) {
		return {
			sourceX: 0,
			sourceY: 0,
			sourceWidth: 0,
			sourceHeight: 0
		}
	}

	const safeZoom = Math.min(3, Math.max(1, zoom))
	const safePositionX = Math.min(1, Math.max(0, positionX))
	const safePositionY = Math.min(1, Math.max(0, positionY))
	const targetRatio = targetWidth / targetHeight
	const sourceRatio = sourceWidth / sourceHeight
	let cropWidth = sourceWidth
	let cropHeight = sourceHeight

	if (sourceRatio > targetRatio) {
		cropWidth = sourceHeight * targetRatio
	} else {
		cropHeight = sourceWidth / targetRatio
	}

	cropWidth /= safeZoom
	cropHeight /= safeZoom

	return {
		sourceX: (sourceWidth - cropWidth) * safePositionX,
		sourceY: (sourceHeight - cropHeight) * safePositionY,
		sourceWidth: cropWidth,
		sourceHeight: cropHeight
	}
}

export function sanitizeCreateFilename(value: string): string {
	const normalized = value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("en")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80)

	return normalized || "anitools-artwork"
}

export function getCreateExportFilename(
	title: string,
	preset: CreatePresetId,
	format: CreateExportFormat
): string {
	const extension = format === "jpeg" ? "jpg" : format
	return `${sanitizeCreateFilename(title)}-${preset}.${extension}`
}

export function getCreateMimeType(format: CreateExportFormat): string {
	return `image/${format}`
}

export function wrapCreateText(
	text: string,
	maxWidth: number,
	measure: (value: string) => number,
	maxLines = 4
): string[] {
	const words = text.trim().split(/\s+/).filter(Boolean)
	if (!words.length || maxLines <= 0) return []

	const lines: string[] = []
	let currentLine = ""

	for (const word of words) {
		const candidate = currentLine ? `${currentLine} ${word}` : word
		if (measure(candidate) <= maxWidth || !currentLine) {
			currentLine = candidate
			continue
		}

		lines.push(currentLine)
		currentLine = word
		if (lines.length === maxLines - 1) break
	}

	if (currentLine && lines.length < maxLines) {
		const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length
		const isTruncated = consumedWords + currentLine.split(/\s+/).length < words.length
		if (isTruncated) {
			let truncated = currentLine
			while (truncated && measure(`${truncated}…`) > maxWidth) {
				truncated = truncated.slice(0, -1).trimEnd()
			}
			currentLine = `${truncated}…`
		}
		lines.push(currentLine)
	}

	return lines
}

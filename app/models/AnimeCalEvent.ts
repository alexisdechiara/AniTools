import type {
	CalendarAiringSchedule,
	CalendarEvent,
	CalendarMedia,
	CalendarSimuldubItem
} from "~/types/calendar"

export const languageToCountry = (item?: unknown): string | undefined => {
	if (typeof item !== "string") {
		return undefined
	}

	const normalizedItem = item.trim().toLowerCase()
	if (!normalizedItem || !/^[a-z0-9-]{2,24}$/.test(normalizedItem)) {
		return undefined
	}

	switch (normalizedItem) {
		case "chinese":
			return "cn"
		case "japanese":
			return "jp"
		case "english":
			return "en"
		case "french":
			return "fr"
		default:
			return normalizedItem
	}
}

function getMediaTitle(media: CalendarMedia) {
	return media.title?.userPreferred
		|| media.title?.english
		|| media.title?.romaji
		|| media.title?.native
		|| `Anime #${media.id}`
}

function getDurationInMilliseconds(media: CalendarMedia) {
	const duration = Number(media.duration)
	const durationMinutes = Number.isFinite(duration) && duration > 0
		? Math.min(duration, 24 * 60)
		: 24

	return durationMinutes * 60 * 1000
}

function normalizeStringList(items: readonly string[] | null | undefined) {
	if (!Array.isArray(items)) return []

	return [...new Set(
		items
			.map(item => item.trim())
			.filter(item => item.length > 0)
	)]
}

export class AnimeCalEvent implements CalendarEvent {
	start: Date
	end: Date
	id: string
	title: string
	content: string
	media: CalendarMedia
	episode: number
	timeUntilAiring?: number
	airingAt: number
	languages: string[]
	streaming: string[]

	constructor(data: CalendarAiringSchedule & { media: CalendarMedia }) {
		const airingAtMs = data.airingAt * 1000
		const durationMs = getDurationInMilliseconds(data.media)

		this.start = new Date(airingAtMs)
		this.end = new Date(airingAtMs + durationMs)
		this.title = getMediaTitle(data.media)
		this.content = `Episode ${data.episode}`
		this.id = `airing-${data.media.id}-${data.episode}-${this.start.getTime()}`
		this.media = data.media
		this.episode = data.episode
		this.timeUntilAiring = data.timeUntilAiring ?? undefined
		this.airingAt = data.airingAt
		const originLanguage = languageToCountry(data.media.countryOfOrigin)
		this.languages = originLanguage ? [originLanguage] : []
		this.streaming = []
	}
}

export class SimuldubCalEvent implements CalendarEvent {
	start: Date
	end: Date
	id: string
	title: string
	content: string
	media: CalendarMedia
	episode?: number
	languages: string[]
	streaming: string[]
	status: CalendarSimuldubItem["status"]

	constructor(data: CalendarSimuldubItem & { media: CalendarMedia }) {
		this.start = new Date(data.start_date)
		const candidateEnd = data.end_date ? new Date(data.end_date) : null
		this.end = candidateEnd
			&& Number.isFinite(candidateEnd.getTime())
			&& candidateEnd > this.start
			? candidateEnd
			: new Date(this.start.getTime() + getDurationInMilliseconds(data.media))
		this.media = data.media
		this.episode = data.episode ?? undefined
		this.title = data.title?.trim() || getMediaTitle(data.media)
		this.content = this.episode ? `Episode ${this.episode}` : "Simuldub"
		this.id = `simuldub-${data.id}-${data.media.id}-${this.episode ?? "unknown"}-${this.start.getTime()}`
		const mappedLanguages = data.languages
			.map(language => languageToCountry(language))
			.filter((language): language is string => typeof language === "string")
		this.languages = [...new Set(mappedLanguages)]
		this.streaming = normalizeStringList(data.streaming)
		this.status = data.status
	}
}

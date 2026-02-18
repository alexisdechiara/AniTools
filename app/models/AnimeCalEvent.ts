import { add } from "date-fns"

interface VueCalEvent {
	start: Date
	end: Date
	id?: string
	title?: string
	content?: string
	class?: string
	background?: number
	schedule?: number
	allDay?: boolean
	resizable?: boolean
	draggable?: boolean
	deletable?: boolean
}

const languageToCountry = (item?: string | null): string | undefined => {
	if (typeof item !== "string") {
		return undefined
	}

	const normalizedItem = item.trim().toLowerCase()
	if (!normalizedItem) {
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

export class AnimeCalEvent implements VueCalEvent {
	start: Date
	end: Date
	id: string
	title?: string
	content?: string
	class?: string
	media: any
	episode?: number
	timeUntilAiring?: number
	airingAt?: number
	languages?: string[]
	streaming?: string[]

	constructor(data: any) {
		const airingAtMs = data.airingAt * 1000
		const durationMs = (data.media?.duration || 24) * 60 * 1000

		this.start = new Date(airingAtMs)
		this.end = new Date(airingAtMs + durationMs)
		this.title = data.media?.title?.userPreferred || data.media?.title?.english || data.media?.title?.romaji || data.media?.title?.native || "Unknown Title"
		this.content = `Episode ${data.episode}`
		this.class = "anime-event"
		this.id = `${data.media?.id}-${data.episode}-${this.start.getTime()}-${this.end.getTime()}`
		this.media = data.media
		this.episode = data.episode
		this.timeUntilAiring = data.timeUntilAiring
		this.airingAt = data.airingAt
		const originLanguage = languageToCountry(data.media?.countryOfOrigin)
		this.languages = originLanguage ? [originLanguage] : []
	}
}

export class SimuldubCalEvent extends AnimeCalEvent {
	status: string

	constructor(data: any) {
		super(data)
		this.start = new Date(data.start_date)
		if (data.end_date) {
			this.end = new Date(data.end_date)
		} else if (data.media?.duration) {
			this.end = add(new Date(this.start), { minutes: data.media.duration })
		}
		this.title = data.title || data.media?.title?.userPreferred || data.media?.title?.english || data.media?.title?.romaji || data.media?.title?.native || "Unknown Title"
		this.id = `${data.media?.id}-${data.episode}-${this.start.getTime()}-${this.end.getTime()}`
		const rawLanguages: Array<string | null | undefined> = Array.isArray(data.languages) ? data.languages : []
		const mappedLanguages = rawLanguages
			.map(language => languageToCountry(language))
			.filter((language): language is string => typeof language === "string")
		this.languages = [...new Set(mappedLanguages)]
		this.streaming = data.streaming
		this.status = data.status ?? "unconfirmed"
	}
}

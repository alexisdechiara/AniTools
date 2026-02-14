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

const languageToCountry = (item: string) => {
	switch (item.toLowerCase()) {
		case "chinese":
			return "cn"
		case "japanese":
			return "jp"
		case "english":
			return "us"
		case "french":
			return "fr"
		default:
			return item.toLowerCase()
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
		this.title = data.media?.title?.english || data.media?.title?.romaji || "Unknown Title"
		this.content = `Episode ${data.episode}`
		this.class = "anime-event"
		this.id = `${data.media?.id}-${data.episode}-${this.start.getTime()}-${this.end.getTime()}`
		this.media = data.media
		this.episode = data.episode
		this.timeUntilAiring = data.timeUntilAiring
		this.airingAt = data.airingAt
		this.languages = [languageToCountry(data.media?.countryOfOrigin)]
	}
}

export class SimuldubCalEvent extends AnimeCalEvent {
	constructor(data: any) {
		super(data)
		this.start = new Date(data.start_date)
		if (data.end_date) {
			this.end = new Date(data.end_date)
		} else if (data.media.duration) {
			this.end = add(new Date(this.start), { minutes: data.media.duration })
		}
		this.id = `${data.media?.id}-${data.episode}-${this.start.getTime()}-${this.end.getTime()}`
		this.languages = data.languages.map(languageToCountry)
		this.streaming = data.streaming
	}
}

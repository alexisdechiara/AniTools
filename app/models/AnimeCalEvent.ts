
interface VueCalEvent {
	start: Date | string
	end: Date | string
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

export class AnimeCalEvent implements VueCalEvent {
	start: Date | string
	end: Date | string
	id?: string
	title?: string
	content?: string
	class?: string
	media: any
	episode?: number
	timeUntilAiring?: number
	airingAt?: number


	constructor(data: any) {
		const airingAtMs = data.airingAt * 1000
		const durationMs = (data.media?.duration || 24) * 60 * 1000

		this.start = new Date(airingAtMs)
		this.end = new Date(airingAtMs + durationMs)
		this.title = data.media?.title?.english || data.media?.title?.romaji || 'Unknown Title'
		this.content = `Episode ${data.episode}`
		this.class = 'anime-event'
		this.id = `${data.media?.id}-${data.episode}`
		this.media = data.media
		this.episode = data.episode
		this.timeUntilAiring = data.timeUntilAiring
		this.airingAt = data.airingAt
	}
}

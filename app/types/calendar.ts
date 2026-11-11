export interface CalendarMediaTitle {
	english?: string | null
	native?: string | null
	romaji?: string | null
	userPreferred?: string | null
}

export interface CalendarMediaCoverImage {
	color?: string | null
	extraLarge?: string | null
	large?: string | null
	medium?: string | null
}

export interface CalendarMedia {
	id: number
	countryOfOrigin?: string | null
	coverImage?: CalendarMediaCoverImage | null
	duration?: number | null
	format?: string | null
	title?: CalendarMediaTitle | null
}

export interface CalendarAiringSchedule {
	airingAt: number
	episode: number
	media?: CalendarMedia | null
	timeUntilAiring?: number | null
}

export type CalendarSimuldubStatus = "cancelled" | "published"

export interface CalendarSimuldubItem {
	anilist_media_id?: number | string | null
	end_date?: string | null
	episode?: number | null
	id: number | string
	languages: string[]
	start_date: string
	status: CalendarSimuldubStatus
	streaming: string[]
	title?: string | null
}

export type CalendarApiWarning =
	| "simuldubs_unavailable"
	| "simuldub_media_unavailable"
	| "simuldub_media_truncated"

/** One airing of the `/api/calendar` response; its anime is `media[mediaId]`. */
export interface CalendarAiringReference {
	airingAt: number
	episode: number
	mediaId: number
	timeUntilAiring?: number | null
}

export interface CalendarApiResponse {
	/** Every anime of the range once, keyed by id: airing ones and simuldub-only ones alike. */
	media: Record<string, CalendarMedia>
	airings: CalendarAiringReference[]
	simuldubs: CalendarSimuldubItem[]
	warnings: CalendarApiWarning[]
}

export type CalendarEventStatus = CalendarSimuldubStatus | "unconfirmed"

export interface CalendarEvent {
	airingAt?: number
	content?: string
	end: Date
	episode?: number
	id: string
	languages: string[]
	media: CalendarMedia
	start: Date
	status?: CalendarEventStatus
	streaming: string[]
	timeUntilAiring?: number
	title: string
}

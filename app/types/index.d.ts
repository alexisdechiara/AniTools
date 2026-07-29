// Type GraphQL généré utilisé par les événements du calendrier
import type { Media } from "#gql/default"

export interface VueCalEvent {
	start: Date | string
	end: Date | string
	id?: string
	title?: string
	content?: string
	class?: string
	allDay?: boolean
	resizable?: boolean
	draggable?: boolean
	deletable?: boolean
}

export interface AnimeCalEventInterface extends VueCalEvent {
	media: Media
	episode?: number
	timeUntilAiring?: number
	airingAt?: number
}

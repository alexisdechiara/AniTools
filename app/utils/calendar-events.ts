import {
	AnimeCalEvent,
	SimuldubCalEvent,
	languageToCountry
} from "~/models/AnimeCalEvent"
import type {
	CalendarAiringSchedule,
	CalendarApiResponse,
	CalendarEvent,
	CalendarMedia,
	CalendarSimuldubItem
} from "~/types/calendar"

function toPositiveInteger(value: unknown) {
	const number = Number(value)
	return Number.isSafeInteger(number) && number > 0 ? number : null
}

function hasValidSchedule(
	schedule: CalendarAiringSchedule
): schedule is CalendarAiringSchedule & { media: CalendarMedia } {
	return Boolean(
		toPositiveInteger(schedule.airingAt)
		&& toPositiveInteger(schedule.episode)
		&& toPositiveInteger(schedule.media?.id)
	)
}

function getMergeKey(mediaId: number, startTime: number, episode?: number) {
	return `${mediaId}:${startTime}:${episode ?? "unknown"}`
}

function normalizeLanguages(languages: readonly string[]) {
	return languages
		.map(language => languageToCountry(language))
		.filter((language): language is string => Boolean(language))
}

function mergeUnique(target: string[], additions: readonly string[]) {
	return [...new Set([...target, ...additions])]
}

function mergeEventMetadata(target: CalendarEvent, source: CalendarEvent) {
	target.languages = mergeUnique(target.languages, source.languages)
	target.streaming = mergeUnique(target.streaming, source.streaming)
}

export function buildCalendarEvents(
	airingSchedules: readonly CalendarAiringSchedule[],
	simuldubs: readonly CalendarSimuldubItem[],
	missingMediaById: ReadonlyMap<number, CalendarMedia> = new Map()
) {
	const events: CalendarEvent[] = []
	const eventsByExactKey = new Map<string, CalendarEvent>()
	const mediaById = new Map<number, CalendarMedia>(missingMediaById)

	for (const schedule of airingSchedules) {
		if (!hasValidSchedule(schedule)) continue

		const event = new AnimeCalEvent(schedule)
		if (!Number.isFinite(event.start.getTime()) || !Number.isFinite(event.end.getTime())) continue

		events.push(event)
		mediaById.set(event.media.id, event.media)
		eventsByExactKey.set(
			getMergeKey(event.media.id, event.start.getTime(), event.episode),
			event
		)
	}

	for (const simuldub of simuldubs) {
		const mediaId = toPositiveInteger(simuldub.anilist_media_id)
		const startTime = Date.parse(simuldub.start_date)
		const episode = simuldub.episode == null
			? undefined
			: toPositiveInteger(simuldub.episode) ?? undefined

		if (!mediaId || !Number.isFinite(startTime)) continue

		const exactKey = getMergeKey(mediaId, startTime, episode)
		const exactMatch = eventsByExactKey.get(exactKey)
		if (exactMatch) {
			exactMatch.languages = mergeUnique(
				exactMatch.languages,
				normalizeLanguages(simuldub.languages)
			)
			exactMatch.streaming = mergeUnique(exactMatch.streaming, simuldub.streaming)
			continue
		}

		const media = mediaById.get(mediaId)
		if (!media) continue

		const event = new SimuldubCalEvent({
			...simuldub,
			media
		})
		if (!Number.isFinite(event.end.getTime()) || event.end <= event.start) continue

		const duplicate = eventsByExactKey.get(exactKey)
		if (duplicate) {
			mergeEventMetadata(duplicate, event)
			continue
		}

		events.push(event)
		eventsByExactKey.set(exactKey, event)
	}

	return events.sort((left, right) =>
		left.start.getTime() - right.start.getTime()
		|| left.media.id - right.media.id
		|| (left.episode ?? 0) - (right.episode ?? 0)
	)
}

/**
 * Rebuilds what `buildCalendarEvents` reads from the deduplicated `/api/calendar` response:
 * every airing gets its anime back (the same object for every episode of a title). An airing
 * whose anime is missing from `media` is dropped.
 */
export function expandCalendarResponse(
	response: Pick<CalendarApiResponse, "airings" | "media">
): { airingSchedules: CalendarAiringSchedule[], mediaById: Map<number, CalendarMedia> } {
	const mediaById = new Map<number, CalendarMedia>()
	for (const media of Object.values(response.media ?? {})) {
		if (toPositiveInteger(media?.id)) mediaById.set(media.id, media)
	}

	const airingSchedules = (response.airings ?? []).flatMap((airing) => {
		const media = mediaById.get(airing.mediaId)
		return media
			? [{
					airingAt: airing.airingAt,
					episode: airing.episode,
					timeUntilAiring: airing.timeUntilAiring,
					media
				}]
			: []
	})

	return { airingSchedules, mediaById }
}

/** The calendar events of one `/api/calendar` response. */
export function buildCalendarEventsFromResponse(
	response: Pick<CalendarApiResponse, "airings" | "media" | "simuldubs">
) {
	const { airingSchedules, mediaById } = expandCalendarResponse(response)
	return buildCalendarEvents(airingSchedules, response.simuldubs ?? [], mediaById)
}

interface ListFilterableEvent {
	media?: { id?: number | null } | null
}

/**
 * Keeps the events whose media is on the list with one of `statuses`. With no status selected
 * every event is kept; under an active filter an event without a media id is hidden.
 */
export function filterCalendarEventsByListStatus<T extends ListFilterableEvent>(
	events: readonly T[],
	statusByMediaId: ReadonlyMap<number, string>,
	statuses: readonly string[]
): T[] {
	if (statuses.length === 0) return [...events]

	const selected = new Set(statuses)
	return events.filter((event) => {
		const mediaId = event.media?.id
		if (mediaId == null) return false
		const status = statusByMediaId.get(mediaId)
		return status !== undefined && selected.has(status)
	})
}

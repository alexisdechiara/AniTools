import {
	AnimeCalEvent,
	SimuldubCalEvent,
	languageToCountry
} from "~/models/AnimeCalEvent"
import type {
	CalendarAiringSchedule,
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

export function chunkCalendarMediaIds(mediaIds: readonly number[], chunkSize = 50) {
	const safeChunkSize = Math.max(1, Math.min(50, Math.trunc(chunkSize)))
	const uniqueIds = [...new Set(mediaIds.filter(id => Number.isSafeInteger(id) && id > 0))]
	const chunks: number[][] = []

	for (let index = 0; index < uniqueIds.length; index += safeChunkSize) {
		chunks.push(uniqueIds.slice(index, index + safeChunkSize))
	}

	return chunks
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

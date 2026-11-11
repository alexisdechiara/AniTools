import { createError } from "h3"
import type {
	AniListAiringSchedule,
	AniListMediaSummary
} from "~~/shared/types/anilist"
import type {
	AniListAiringId,
	AniListRequestOptions,
	getAniListAiringIds,
	getAniListMediaByIdsBatch
} from "~~/server/utils/anilist-client"

export interface CalendarAiringDependencies {
	fetchAiringIds: typeof getAniListAiringIds
	fetchMediaByIds: typeof getAniListMediaByIdsBatch
	now?: () => number
}

/** Anime details change rarely and are shared by every range that shows the same title. */
export const MEDIA_CACHE_TTL_MS = 30 * 60 * 1000
export const MAX_CACHED_MEDIA = 2_000
// 2 requests × 32 pages × 50 rows = 3 200 airings.
// Keep commas off exported lines: the auto-import scanner reads them as multi-name declarations.
export const MAX_AIRING_REQUESTS = 2
export const MEDIA_IDS_PER_REQUEST = 200

interface CachedMedia {
	/** `null`: requested but not returned (adult, not anime or deleted), so not asked again. */
	media: AniListMediaSummary | null
	expiresAt: number
}

/**
 * Loads a calendar range as airing ids first, then each distinct anime once, with a
 * per-anime cache shared by every range (and by the simuldub media lookup).
 */
export function createCalendarAiringLoader(dependencies: CalendarAiringDependencies) {
	const now = dependencies.now ?? Date.now
	const mediaCache = new Map<number, CachedMedia>()

	function readCached(mediaId: number, at: number) {
		const entry = mediaCache.get(mediaId)
		if (!entry) return undefined
		if (entry.expiresAt <= at) {
			mediaCache.delete(mediaId)
			return undefined
		}
		// Re-inserting keeps the Map's insertion order least-recently-used first.
		mediaCache.delete(mediaId)
		mediaCache.set(mediaId, entry)
		return entry
	}

	function writeCached(mediaId: number, media: AniListMediaSummary | null, at: number) {
		mediaCache.delete(mediaId)
		mediaCache.set(mediaId, { media, expiresAt: at + MEDIA_CACHE_TTL_MS })
		while (mediaCache.size > MAX_CACHED_MEDIA) {
			const oldestId = mediaCache.keys().next().value
			if (oldestId === undefined) break
			mediaCache.delete(oldestId)
		}
	}

	/** Every requested id mapped to its media, or `null` when AniList has none to show. */
	async function resolveMedia(
		mediaIds: readonly number[],
		options: AniListRequestOptions
	): Promise<Map<number, AniListMediaSummary | null>> {
		const uniqueIds = [...new Set(mediaIds)]
		const resolved = new Map<number, AniListMediaSummary | null>()
		const missingIds: number[] = []
		const readAt = now()

		for (const mediaId of uniqueIds) {
			const cached = readCached(mediaId, readAt)
			if (cached) {
				resolved.set(mediaId, cached.media)
			} else {
				missingIds.push(mediaId)
			}
		}

		for (let index = 0; index < missingIds.length; index += MEDIA_IDS_PER_REQUEST) {
			const group = missingIds.slice(index, index + MEDIA_IDS_PER_REQUEST)
			const returned = await dependencies.fetchMediaByIds(group, options)
			const fetchedAt = now()
			const returnedById = new Map(returned.map(media => [media.id, media]))

			for (const mediaId of group) {
				const media = returnedById.get(mediaId) ?? null
				writeCached(mediaId, media, fetchedAt)
				resolved.set(mediaId, media)
			}
		}

		return resolved
	}

	async function loadAiringSchedules(
		airingAtGreater: number,
		airingAtLesser: number,
		options: AniListRequestOptions = {}
	): Promise<AniListAiringSchedule[]> {
		const airings: AniListAiringId[] = []
		let response = await dependencies.fetchAiringIds({ airingAtGreater, airingAtLesser }, options)
		let requestCount = 1
		airings.push(...response.airings)

		while (response.hasNextPage && requestCount < MAX_AIRING_REQUESTS) {
			response = await dependencies.fetchAiringIds({
				airingAtGreater,
				airingAtLesser,
				firstPage: response.nextPage
			}, options)
			requestCount++
			airings.push(...response.airings)
		}

		if (response.hasNextPage) {
			throw createError({
				statusCode: 502,
				statusMessage: "AniList calendar response exceeded the page limit"
			})
		}

		const mediaById = await resolveMedia(airings.map(airing => airing.mediaId), options)

		return airings.flatMap((airing) => {
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
	}

	async function loadMediaByIds(
		mediaIds: readonly number[],
		options: AniListRequestOptions = {}
	): Promise<AniListMediaSummary[]> {
		const mediaById = await resolveMedia(mediaIds, options)
		return [...mediaById.values()].flatMap(media => media ? [media] : [])
	}

	return {
		loadAiringSchedules,
		loadMediaByIds,
		/** Number of anime (present or known absent) currently cached. */
		cachedMediaCount: () => mediaCache.size,
		clear: () => mediaCache.clear()
	}
}

import { describe, expect, it, vi } from "vitest"
import type { AniListAiringId } from "../../server/utils/anilist-client"
import {
	createCalendarAiringLoader,
	MAX_CACHED_MEDIA,
	MEDIA_CACHE_TTL_MS,
	toCalendarMediaPayload
} from "../../server/utils/calendar-airing"
import type { AniListMediaSummary } from "../../shared/types/anilist"

const START = 1_800_000_000
const END = START + 42 * 86_400

function fakeMedia(id: number): AniListMediaSummary {
	return { id, type: "ANIME", isAdult: false } as AniListMediaSummary
}

/** `count` rows cycling through media ids `firstMediaId … firstMediaId + mediaCount - 1`. */
function airingRows(count: number, mediaCount: number, firstMediaId = 1): AniListAiringId[] {
	return Array.from({ length: count }, (_, index) => ({
		airingAt: START + index * 60,
		episode: 1 + Math.floor(index / mediaCount),
		timeUntilAiring: index * 60,
		mediaId: firstMediaId + (index % mediaCount)
	}))
}

function setup(options: {
	rows?: AniListAiringId[]
	absentIds?: readonly number[]
	pages?: Array<{ airings: AniListAiringId[], hasNextPage: boolean, nextPage: number }>
} = {}) {
	let currentTime = 1_000
	const absent = new Set(options.absentIds ?? [])
	let rows = options.rows ?? []
	const fetchAiringIds = vi.fn(async (query: { firstPage?: number }) => {
		if (options.pages) {
			return options.pages[(query.firstPage ?? 1) === 1 ? 0 : 1]!
		}
		return { airings: rows, hasNextPage: false, nextPage: 33 }
	})
	const fetchMediaByIds = vi.fn(async (mediaIds: readonly number[]) =>
		mediaIds.filter(id => !absent.has(id)).map(fakeMedia))
	const loader = createCalendarAiringLoader({
		fetchAiringIds: fetchAiringIds as unknown as Parameters<typeof createCalendarAiringLoader>[0]["fetchAiringIds"],
		fetchMediaByIds,
		now: () => currentTime
	})

	return {
		loader,
		fetchAiringIds,
		fetchMediaByIds,
		setRows: (next: AniListAiringId[]) => { rows = next },
		advance: (ms: number) => { currentTime += ms }
	}
}

describe("calendar airing loader", () => {
	it("loads a month of airings with one airing request and one media request", async () => {
		const rows = airingRows(697, 137)
		const { loader, fetchAiringIds, fetchMediaByIds } = setup({ rows, absentIds: [5, 6] })

		const result = await loader.loadAiringSchedules(START, END, { timeoutMs: 12_000 })

		expect(fetchAiringIds).toHaveBeenCalledTimes(1)
		expect(fetchAiringIds).toHaveBeenCalledWith(
			{ airingAtGreater: START, airingAtLesser: END },
			{ timeoutMs: 12_000 }
		)
		expect(fetchMediaByIds).toHaveBeenCalledTimes(1)
		expect(fetchMediaByIds.mock.calls[0]![0]).toHaveLength(137)
		const expectedRows = rows.filter(row => row.mediaId !== 5 && row.mediaId !== 6)
		expect(result).toHaveLength(expectedRows.length)
		expect(result.map(schedule => [schedule.airingAt, schedule.media?.id]))
			.toEqual(expectedRows.map(row => [row.airingAt, row.mediaId]))
		expect(result[0]).toEqual({
			airingAt: rows[0]!.airingAt,
			episode: rows[0]!.episode,
			timeUntilAiring: rows[0]!.timeUntilAiring,
			media: fakeMedia(1)
		})
	})

	it("requests only the anime a later range has not loaded yet", async () => {
		const { loader, fetchMediaByIds, setRows } = setup({ rows: airingRows(300, 137) })
		await loader.loadAiringSchedules(START, END)

		// Shares media 38…137 with the first range and adds 138…167.
		setRows(airingRows(260, 130, 38))
		await loader.loadAiringSchedules(START + 86_400, END + 86_400)
		expect(fetchMediaByIds).toHaveBeenCalledTimes(2)
		expect(fetchMediaByIds.mock.calls[1]![0]).toEqual(
			Array.from({ length: 30 }, (_, index) => 138 + index)
		)

		setRows(airingRows(50, 20, 40))
		const result = await loader.loadAiringSchedules(START + 2 * 86_400, END)
		expect(fetchMediaByIds).toHaveBeenCalledTimes(2)
		expect(result).toHaveLength(50)
	})

	it("drops airings whose media AniList did not return and does not ask for them again", async () => {
		const rows = airingRows(40, 10)
		const { loader, fetchMediaByIds } = setup({ rows, absentIds: [3] })

		const first = await loader.loadAiringSchedules(START, END)
		expect(first).toHaveLength(36)
		expect(first.some(schedule => schedule.media?.id === 3)).toBe(false)

		const second = await loader.loadAiringSchedules(START, END)
		expect(second).toHaveLength(36)
		expect(fetchMediaByIds).toHaveBeenCalledTimes(1)
		await expect(loader.loadMediaByIds([3])).resolves.toEqual([])
		expect(fetchMediaByIds).toHaveBeenCalledTimes(1)
	})

	it("requests the media again once the cache entry has expired", async () => {
		const { loader, fetchMediaByIds, advance } = setup({ rows: airingRows(20, 5), absentIds: [2] })
		await loader.loadAiringSchedules(START, END)

		advance(MEDIA_CACHE_TTL_MS - 1)
		await loader.loadAiringSchedules(START, END)
		expect(fetchMediaByIds).toHaveBeenCalledTimes(1)

		advance(1)
		await loader.loadAiringSchedules(START, END)
		expect(fetchMediaByIds).toHaveBeenCalledTimes(2)
		expect(fetchMediaByIds.mock.calls[1]![0]).toEqual([1, 2, 3, 4, 5])
	})

	it("splits more than 200 missing anime into groups of 200", async () => {
		const { loader, fetchMediaByIds } = setup({ rows: airingRows(450, 450) })

		const result = await loader.loadAiringSchedules(START, END)

		expect(result).toHaveLength(450)
		expect(fetchMediaByIds.mock.calls.map(([ids]) => ids.length)).toEqual([200, 200, 50])
	})

	it("loads a second batch of airing pages and gives up after two", async () => {
		const rows = airingRows(4, 2)
		const twoPages = setup({
			pages: [
				{ airings: rows.slice(0, 2), hasNextPage: true, nextPage: 33 },
				{ airings: rows.slice(2), hasNextPage: false, nextPage: 65 }
			]
		})

		await expect(twoPages.loader.loadAiringSchedules(START, END)).resolves.toHaveLength(4)
		expect(twoPages.fetchAiringIds).toHaveBeenCalledTimes(2)
		expect(twoPages.fetchAiringIds.mock.calls[1]![0]).toEqual({
			airingAtGreater: START,
			airingAtLesser: END,
			firstPage: 33
		})

		const tooMany = setup({
			pages: [
				{ airings: rows.slice(0, 2), hasNextPage: true, nextPage: 33 },
				{ airings: rows.slice(2), hasNextPage: true, nextPage: 65 }
			]
		})
		await expect(tooMany.loader.loadAiringSchedules(START, END)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: "AniList calendar response exceeded the page limit"
		})
		expect(tooMany.fetchAiringIds).toHaveBeenCalledTimes(2)
		expect(tooMany.fetchMediaByIds).not.toHaveBeenCalled()
	})

	it("never caches more than the media limit and evicts the least recently used", async () => {
		const { loader, fetchMediaByIds } = setup()
		const total = MAX_CACHED_MEDIA + 100
		const ids = Array.from({ length: total }, (_, index) => index + 1)

		for (let index = 0; index < ids.length; index += 200) {
			await loader.loadMediaByIds(ids.slice(index, index + 200))
			expect(loader.cachedMediaCount()).toBeLessThanOrEqual(MAX_CACHED_MEDIA)
		}
		expect(loader.cachedMediaCount()).toBe(MAX_CACHED_MEDIA)

		fetchMediaByIds.mockClear()
		// The newest ids are still cached; the oldest hundred were evicted.
		await loader.loadMediaByIds(ids.slice(-100))
		expect(fetchMediaByIds).not.toHaveBeenCalled()
		await expect(loader.loadMediaByIds([1, 2])).resolves.toEqual([fakeMedia(1), fakeMedia(2)])
		expect(fetchMediaByIds).toHaveBeenCalledWith([1, 2], {})
		expect(loader.cachedMediaCount()).toBe(MAX_CACHED_MEDIA)
	})

	it("returns cached and fetched simuldub media without calling AniList for an empty list", async () => {
		const { loader, fetchMediaByIds } = setup({ absentIds: [9] })

		await expect(loader.loadMediaByIds([])).resolves.toEqual([])
		expect(fetchMediaByIds).not.toHaveBeenCalled()
		await expect(loader.loadMediaByIds([7, 8, 9, 7])).resolves.toEqual([fakeMedia(7), fakeMedia(8)])
		expect(fetchMediaByIds).toHaveBeenCalledWith([7, 8, 9], {})

		loader.clear()
		expect(loader.cachedMediaCount()).toBe(0)
	})
})

describe("calendar response payload", () => {
	it("sends each anime once and references it from its airings", async () => {
		const rows = airingRows(697, 137)
		const { loader } = setup({ rows })
		const schedules = await loader.loadAiringSchedules(START, END)

		const payload = toCalendarMediaPayload(schedules, [fakeMedia(900), fakeMedia(1)])

		expect(Object.keys(payload.media)).toHaveLength(138)
		expect(payload.media[1]).toEqual(fakeMedia(1))
		expect(payload.media[900]).toEqual(fakeMedia(900))
		expect(payload.airings).toHaveLength(697)
		expect(payload.airings[0]).toEqual({
			airingAt: rows[0]!.airingAt,
			episode: rows[0]!.episode,
			mediaId: rows[0]!.mediaId,
			timeUntilAiring: rows[0]!.timeUntilAiring
		})
		expect(payload.airings.map(airing => airing.mediaId)).toEqual(rows.map(row => row.mediaId))
		expect(payload.airings.every(airing => !("media" in airing))).toBe(true)
		// The repeated anime was the bulk of the response.
		expect(JSON.stringify(payload).length).toBeLessThan(JSON.stringify(schedules).length)
	})

	it("skips a schedule without media and accepts an empty range", () => {
		expect(toCalendarMediaPayload([
			{ airingAt: START, episode: 1, timeUntilAiring: null, media: null }
		])).toEqual({ media: {}, airings: [] })
		expect(toCalendarMediaPayload([])).toEqual({ media: {}, airings: [] })
	})
})

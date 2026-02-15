import { createDirectus, rest, readItems } from "@directus/sdk"

interface DateRange {
	start: string | Date
	end: string | Date
}
const SIMULDUB_RANGE_CACHE_TTL_MS = 5 * 60 * 1000
const SIMULDUB_ALL_CACHE_TTL_MS = 5 * 60 * 1000

const formatDateToUTC = (date: string | Date): string => {
	if (typeof date === "string") return date
	return date.toISOString()
}

export const useSimuldub = () => {
	const directus = createDirectus("https://api.anitools.geekly.blog").with(rest())

	async function fetchSimuldubByDateRange(dateRange?: DateRange) {
		const calendarStore = useCalendarStore()
		const rangeStart = computed(() => formatDateToUTC(dateRange?.start ?? calendarStore.dateRange.start))
		const rangeEnd = computed(() => formatDateToUTC(dateRange?.end ?? calendarStore.dateRange.end))
		const simuldubRangeCache = useState<Record<string, { data: any[], expiresAt: number }>>(
			"simuldub-range-cache",
			() => ({})
		)

		return await useAsyncData(
			`simuldubs-${rangeStart.value}-${rangeEnd.value}`,
			async () => {
				const cacheKey = `${rangeStart.value}-${rangeEnd.value}`
				const cached = simuldubRangeCache.value[cacheKey]
				if (cached && cached.expiresAt > Date.now()) {
					return cached.data
				}

				const simuldubs = await directus.request(
					readItems("simuldub", {
						filter: {
							status: {
								_or: [{ _eq: "published" }, { _eq: "cancelled" }]
							},
							start_date: {
								_gte: rangeStart.value,
								_lte: rangeEnd.value
							}
						}
					})
				)

				simuldubRangeCache.value[cacheKey] = {
					data: simuldubs,
					expiresAt: Date.now() + SIMULDUB_RANGE_CACHE_TTL_MS
				}

				return simuldubs
			},
			{
				watch: [rangeStart, rangeEnd]
			}
		)
	}

	async function fetchAllSimuldub() {
		const simuldubAllCache = useState<{ data: any[], expiresAt: number } | null>(
			"simuldub-all-cache",
			() => null
		)

		return await useAsyncData("simuldubs-all", async () => {
			const cached = simuldubAllCache.value
			if (cached && cached.expiresAt > Date.now()) {
				return cached.data
			}

			const simuldubs = await directus.request(
				readItems("simuldub", {
					filter: {
						status: {
							_or: [{ _eq: "published" }, { _eq: "cancelled" }]
						}
					}
				})
			)

			simuldubAllCache.value = {
				data: simuldubs,
				expiresAt: Date.now() + SIMULDUB_ALL_CACHE_TTL_MS
			}

			return simuldubs
		})
	}

	return {
		client: directus,
		fetchSimuldubByDateRange,
		fetchAllSimuldub
	}
}

import { createDirectus, rest, readItems } from "@directus/sdk"

interface DateRange {
	start: string | Date
	end: string | Date
}

const formatDateToUTC = (date: string | Date): string => {
	if (typeof date === "string") return date
	return date.toISOString()
}

export const useSimuldub = () => {
	const directus = createDirectus("http://anitools-directus-7bfe7d-62-72-18-119.traefik.me").with(rest({ credentials: "include" }))

	async function fetchSimuldubByDateRange(dateRange: DateRange) {
		const startDate = formatDateToUTC(dateRange.start)
		const endDate = formatDateToUTC(dateRange.end)

		return await useAsyncData(() =>
			directus.request(
				readItems("simuldub", {
					filter: {
						status: {
							_or: [{ _eq: "published" }, { _eq: "draft" }]
						},
						start_date: {
							_gte: startDate,
							_lte: endDate
						}
					}
				})
			)
		)
	}

	async function fetchAllSimuldub() {
		return await useAsyncData(() =>
			directus.request(
				readItems("simuldub", {
					filter: {
						status: {
							_or: [{ _eq: "published" }, { _eq: "draft" }]
						}
					}
				})
			)
		)
	}

	return {
		client: directus,
		fetchSimuldubByDateRange,
		fetchAllSimuldub
	}
}

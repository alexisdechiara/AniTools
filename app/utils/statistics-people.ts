import type {
	AniListStaffStatistic,
	AniListStaffSummary,
	AniListVoiceActorStatistic
} from "~~/shared/types/anilist"

export type StatisticsPeopleMetric = "count" | "meanScore" | "minutesWatched"
export type StatisticsPeopleKind = "staff" | "voiceActors"

export interface StatisticsPersonItem {
	id: number
	name: string
	nativeName: string | null
	imageUrl: string | null
	language: string | null
	occupations: string[]
	count: number
	meanScore: number
	minutesWatched: number
	mediaIds: number[]
	characterCount: number | null
}

function personName(person: AniListStaffSummary): string {
	return person.name?.userPreferred
		?? person.name?.full
		?? person.name?.native
		?? `AniList staff #${person.id}`
}

function personItem(
	person: AniListStaffSummary,
	statistic: Pick<
		AniListStaffStatistic,
		"count" | "meanScore" | "mediaIds" | "minutesWatched"
	>,
	characterCount: number | null
): StatisticsPersonItem {
	return {
		id: person.id,
		name: personName(person),
		nativeName: person.name?.native ?? null,
		imageUrl: person.image?.large ?? person.image?.medium ?? null,
		language: person.language,
		occupations: person.primaryOccupations,
		count: statistic.count,
		meanScore: statistic.meanScore,
		minutesWatched: statistic.minutesWatched,
		mediaIds: statistic.mediaIds,
		characterCount
	}
}

export function mapVoiceActorStatistics(
	statistics: readonly AniListVoiceActorStatistic[]
): StatisticsPersonItem[] {
	return statistics.flatMap(statistic =>
		statistic.voiceActor
			? [personItem(
					statistic.voiceActor,
					statistic,
					new Set(statistic.characterIds).size
				)]
			: []
	)
}

export function mapStaffStatistics(
	statistics: readonly AniListStaffStatistic[]
): StatisticsPersonItem[] {
	return statistics.flatMap(statistic =>
		statistic.staff
			? [personItem(statistic.staff, statistic, null)]
			: []
	)
}

export function filterAndSortPeopleStatistics(
	items: readonly StatisticsPersonItem[],
	metric: StatisticsPeopleMetric,
	search = ""
): StatisticsPersonItem[] {
	const normalizedSearch = search.trim().toLocaleLowerCase()
	const matches = normalizedSearch
		? items.filter((item) => {
				const searchable = [
					item.name,
					item.nativeName,
					item.language,
					...item.occupations
				]
					.filter((value): value is string => value !== null)
					.join(" ")
					.toLocaleLowerCase()
				return searchable.includes(normalizedSearch)
			})
		: [...items]

	return matches.toSorted((left, right) =>
		right[metric] - left[metric]
		|| right.count - left.count
		|| left.name.localeCompare(right.name)
		|| left.id - right.id
	)
}

export function getAniListStaffUrl(staffId: number): string {
	if (!Number.isInteger(staffId) || staffId <= 0) {
		throw new Error("AniList staff id must be a positive integer")
	}

	return `https://anilist.co/staff/${staffId}`
}

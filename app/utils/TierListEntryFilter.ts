import type { TierlistEntry, TierlistFilters } from "~/types/tierlist"

function normalize(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? ""
}

export function matchesTierlistFilters(entry: TierlistEntry, filters: TierlistFilters): boolean {
	const media = entry.media

	if (filters.title) {
		const title = media.title?.english
			?? media.title?.romaji
			?? media.title?.native
			?? media.title?.userPreferred
			?? ""
		if (!normalize(title).includes(normalize(filters.title))) return false
	}

	if (
		filters.genres.length > 0
		&& !media.genres?.some(genre => filters.genres.includes(genre))
	) return false

	if (
		filters.years.length > 0
		&& (!media.startDate?.year || !filters.years.includes(media.startDate.year))
	) return false

	if (
		filters.seasons.length > 0
		&& (!media.season || !filters.seasons.includes(media.season))
	) return false

	if (
		filters.formats.length > 0
		&& (!media.format || !filters.formats.includes(media.format))
	) return false

	const [minimumScore, maximumScore] = filters.score
	const score = entry.score ?? 0
	return score >= minimumScore && score <= maximumScore
}

export function useTierListEntryFilter() {
	const tierlistStore = useTierlistStore()
	const {
		filterTitle,
		filterGenres,
		filterYears,
		filterSeasons,
		filterFormats,
		filterScore
	} = storeToRefs(tierlistStore)

	function filterEntry(entry: TierlistEntry): boolean {
		return matchesTierlistFilters(entry, {
			title: filterTitle.value,
			genres: filterGenres.value,
			years: filterYears.value,
			seasons: filterSeasons.value,
			formats: filterFormats.value,
			score: filterScore.value
		})
	}

	return {
		filterEntry
	}
}

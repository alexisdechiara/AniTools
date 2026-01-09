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

	function filterEntry(entry: any): boolean {
		if (!entry?.media) return true

		// Filter by title
		if (filterTitle.value) {
			const title = entry.media.title?.english || entry.media.title?.romaji || entry.media.title?.native || ""
			if (!title.toLowerCase().includes(filterTitle.value.toLowerCase())) {
				return false
			}
		}

		// Filter by genres
		if (filterGenres.value.length > 0) {
			if (!entry.media.genres?.some((genre: string) => filterGenres.value.includes(genre))) {
				return false
			}
		}

		// Filter by years
		if (filterYears.value.length > 0) {
			if (!entry.media.startDate?.year || !filterYears.value.includes(entry.media.startDate.year)) {
				return false
			}
		}

		// Filter by seasons
		if (filterSeasons.value.length > 0) {
			if (!entry.media.season || !filterSeasons.value.includes(entry.media.season)) {
				return false
			}
		}

		// Filter by formats
		if (filterFormats.value.length > 0) {
			if (!entry.media.format || !filterFormats.value.includes(entry.media.format)) {
				return false
			}
		}

		// Filter by score
		if (filterScore.value > 0) {
			if ((entry.score || 0) < filterScore.value) {
				return false
			}
		}

		return true
	}

	return {
		filterEntry
	}
}

import { formatPersonalScore, formatScoreFromPercent } from "~/utils/score-format"

/**
 * Formats a personal AniList list score for display.
 *
 * AniList returns list scores in whichever `scoreFormat` the owning profile
 * configured on anilist.co (tracked in the User store), which is not
 * necessarily the format the visitor wants to read — this bridges the two
 * using the locally-persisted display preference.
 */
export function usePersonalScore() {
	const userStore = useUserStore()
	const preferences = usePreferencesStore()

	const sourceFormat = computed(() => userStore.mediaListOptions.scoreFormat ?? "POINT_100")
	const displayFormat = computed(() => preferences.scoreFormat)

	function format(rawScore: number | null | undefined): string {
		return formatPersonalScore(rawScore, sourceFormat.value, displayFormat.value)
	}

	/** Formats a score AniList already reports on its 100-point scale, such as statistics means. */
	function formatPercent(percent: number | null | undefined): string {
		return formatScoreFromPercent(percent, displayFormat.value)
	}

	return {
		format,
		formatPercent,
		displayFormat
	}
}

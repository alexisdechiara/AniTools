// app/stores/Preferences.ts
import { defineStore } from "pinia"
import {
	ANILIST_SCORE_FORMATS,
	type AniListScoreFormat
} from "~~/shared/types/anilist"

function isAniListScoreFormat(value: unknown): value is AniListScoreFormat {
	return typeof value === "string" && (ANILIST_SCORE_FORMATS as readonly string[]).includes(value)
}

export const usePreferencesStore = defineStore("preferences", () => {
	const scoreFormat = ref<AniListScoreFormat>("POINT_100")
	// Whether the calendar opens filtered to the visitor's list. Per browser, not per profile.
	const calendarMyList = ref(false)

	function setScoreFormat(format: AniListScoreFormat) {
		if (!isAniListScoreFormat(format)) return
		scoreFormat.value = format
	}

	function setCalendarMyList(active: boolean) {
		calendarMyList.value = active === true
	}

	function reset() {
		scoreFormat.value = "POINT_100"
		calendarMyList.value = false
	}

	return {
		scoreFormat,
		calendarMyList,
		setScoreFormat,
		setCalendarMyList,
		reset
	}
}, {
	persist: {
		storage: piniaPluginPersistedstate.localStorage(),
		pick: ["scoreFormat", "calendarMyList"]
	}
})

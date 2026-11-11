// app/stores/Preferences.ts
import { defineStore } from "pinia"
import {
	ANILIST_SCORE_FORMATS,
	type AniListScoreFormat
} from "~~/shared/types/anilist"
import {
	isHourCycleChoice,
	isValidTimeZone,
	type HourCycleChoice,
	type TimeZoneChoice
} from "~/utils/time-display"

function isAniListScoreFormat(value: unknown): value is AniListScoreFormat {
	return typeof value === "string" && (ANILIST_SCORE_FORMATS as readonly string[]).includes(value)
}

export const usePreferencesStore = defineStore("preferences", () => {
	const scoreFormat = ref<AniListScoreFormat>("POINT_100")
	// Whether the calendar opens filtered to the visitor's list. Per browser, not per profile.
	const calendarMyList = ref(false)
	// "auto" follows the AniList profile's zone for a signed-in visitor, then the browser's.
	// Read through useTimeDisplay(), which also copes with a stored value Intl cannot use.
	const timeZoneChoice = ref<TimeZoneChoice>("auto")
	const hourCycle = ref<HourCycleChoice>("auto")

	function setScoreFormat(format: AniListScoreFormat) {
		if (!isAniListScoreFormat(format)) return
		scoreFormat.value = format
	}

	function setCalendarMyList(active: boolean) {
		calendarMyList.value = active === true
	}

	function setTimeZoneChoice(choice: TimeZoneChoice) {
		if (choice !== "auto" && choice !== "browser" && !isValidTimeZone(choice)) return
		timeZoneChoice.value = choice
	}

	function setHourCycle(choice: HourCycleChoice) {
		if (!isHourCycleChoice(choice)) return
		hourCycle.value = choice
	}

	function reset() {
		scoreFormat.value = "POINT_100"
		calendarMyList.value = false
		timeZoneChoice.value = "auto"
		hourCycle.value = "auto"
	}

	return {
		scoreFormat,
		calendarMyList,
		timeZoneChoice,
		hourCycle,
		setScoreFormat,
		setCalendarMyList,
		setTimeZoneChoice,
		setHourCycle,
		reset
	}
}, {
	persist: {
		storage: piniaPluginPersistedstate.localStorage(),
		pick: ["scoreFormat", "calendarMyList", "timeZoneChoice", "hourCycle"]
	}
})

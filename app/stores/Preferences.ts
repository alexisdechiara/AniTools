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

	function setScoreFormat(format: AniListScoreFormat) {
		if (!isAniListScoreFormat(format)) return
		scoreFormat.value = format
	}

	function reset() {
		scoreFormat.value = "POINT_100"
	}

	return {
		scoreFormat,
		setScoreFormat,
		reset
	}
}, {
	persist: {
		storage: piniaPluginPersistedstate.localStorage(),
		pick: ["scoreFormat"]
	}
})

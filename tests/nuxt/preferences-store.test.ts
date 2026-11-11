import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { usePreferencesStore } from "~/stores/Preferences"
import type { AniListScoreFormat } from "~~/shared/types/anilist"

describe("Preferences store", () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it("defaults to the POINT_100 score format", () => {
		const preferences = usePreferencesStore()

		expect(preferences.scoreFormat).toBe("POINT_100")
	})

	it("changes the score format to a valid value", () => {
		const preferences = usePreferencesStore()

		preferences.setScoreFormat("POINT_10")

		expect(preferences.scoreFormat).toBe("POINT_10")
	})

	it("ignores an invalid score format", () => {
		const preferences = usePreferencesStore()
		preferences.setScoreFormat("POINT_5")

		preferences.setScoreFormat("NOPE" as unknown as AniListScoreFormat)

		expect(preferences.scoreFormat).toBe("POINT_5")
	})

	it("restores POINT_100 on reset", () => {
		const preferences = usePreferencesStore()
		preferences.setScoreFormat("POINT_3")

		preferences.reset()

		expect(preferences.scoreFormat).toBe("POINT_100")
	})
})

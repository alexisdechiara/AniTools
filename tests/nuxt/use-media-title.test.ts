import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useMediaTitle } from "~/composables/useMediaTitle"
import { useUserStore } from "~/stores/User"

const media = {
	id: 7,
	title: {
		userPreferred: "Shingeki no Kyojin",
		english: "Attack on Titan",
		romaji: "Shingeki no Kyojin",
		native: "進撃の巨人"
	}
}

describe("useMediaTitle", () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it("follows the AniList title language for an OAuth session", () => {
		const user = useUserStore()
		user.id = 1
		user.authMode = "oauth"
		user.options.titleLanguage = "NATIVE"

		expect(useMediaTitle().title(media)).toBe("進撃の巨人")

		user.options.titleLanguage = "ENGLISH_STYLISED"
		expect(useMediaTitle().title(media)).toBe("Attack on Titan")
	})

	it("ignores the title language on a public profile, whose owner is not the visitor", () => {
		const user = useUserStore()
		user.id = 1
		user.authMode = "public"
		user.options.titleLanguage = "NATIVE"

		expect(useMediaTitle().title(media)).toBe("Shingeki no Kyojin")
	})

	it("ignores the title language without a profile", () => {
		const user = useUserStore()
		user.options.titleLanguage = "NATIVE"

		expect(useMediaTitle().title(media)).toBe("Shingeki no Kyojin")
	})

	it("reacts to a language change made after the composable was created", () => {
		const user = useUserStore()
		user.id = 1
		user.authMode = "oauth"
		user.options.titleLanguage = "ROMAJI"
		const { title } = useMediaTitle()
		const english = { ...media, title: { ...media.title, userPreferred: "Preferred" } }

		expect(title(english)).toBe("Shingeki no Kyojin")

		user.options.titleLanguage = "ENGLISH"
		expect(title(english)).toBe("Attack on Titan")
	})
})

import { describe, expect, it } from "vitest"
import { getAudioLanguageLabel, getEventAudioLabel } from "../../app/utils/calendar-audio"

describe("getAudioLanguageLabel", () => {
	it("names the known flag codes and upper-cases the others", () => {
		expect(getAudioLanguageLabel("jp")).toBe("Japanese")
		expect(getAudioLanguageLabel("en")).toBe("English")
		expect(getAudioLanguageLabel("de")).toBe("DE")
	})
})

describe("getEventAudioLabel", () => {
	it("calls the language of the country of origin the original audio, never a dub", () => {
		expect(getEventAudioLabel({ languages: ["jp"], media: { countryOfOrigin: "JP" } }))
			.toBe("Japanese audio")
		expect(getEventAudioLabel({ languages: ["cn"], media: { countryOfOrigin: "CN" } }))
			.toBe("Chinese audio")
	})

	it("names every other language as a dub", () => {
		expect(getEventAudioLabel({ languages: ["jp", "en"], media: { countryOfOrigin: "JP" } }))
			.toBe("Japanese audio, English dub")
		expect(getEventAudioLabel({ languages: ["jp", "en", "fr"], media: { countryOfOrigin: "JP" } }))
			.toBe("Japanese audio, English and French dubs")
	})

	it("describes a simuldub event, which carries no original audio", () => {
		expect(getEventAudioLabel({ languages: ["en"], media: { countryOfOrigin: "JP" } }))
			.toBe("English dub")
		expect(getEventAudioLabel({ languages: ["en", "fr", "de"], media: { countryOfOrigin: " jp " } }))
			.toBe("English, French and DE dubs")
	})

	it("only lists the languages when the country of origin is unknown", () => {
		expect(getEventAudioLabel({ languages: ["jp", "en"], media: { countryOfOrigin: null } }))
			.toBe("Audio: Japanese, English")
		expect(getEventAudioLabel({ languages: ["jp", "en"] })).toBe("Audio: Japanese, English")
	})

	it("ignores repeated codes and returns nothing without a language", () => {
		expect(getEventAudioLabel({ languages: ["jp", "jp", "en", "en"], media: { countryOfOrigin: "JP" } }))
			.toBe("Japanese audio, English dub")
		expect(getEventAudioLabel({ languages: [], media: { countryOfOrigin: "JP" } })).toBe("")
	})
})

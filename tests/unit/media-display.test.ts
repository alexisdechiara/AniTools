import { describe, expect, it } from "vitest"
import {
	getMediaCover,
	getMediaTitle,
	sanitizeMediaDescription
} from "../../app/utils/media-display"

const title = {
	userPreferred: "Shingeki no Kyojin",
	english: "Attack on Titan",
	romaji: "Shingeki no Kyojin (romaji)",
	native: "進撃の巨人"
}

describe("getMediaTitle", () => {
	it("uses the neutral order without a language: userPreferred, english, romaji, native", () => {
		expect(getMediaTitle({ id: 1, title })).toBe("Shingeki no Kyojin")
		expect(getMediaTitle({ id: 1, title: { ...title, userPreferred: null } })).toBe("Attack on Titan")
		expect(getMediaTitle({ id: 1, title: { romaji: "Romaji", native: "ネイティブ" } })).toBe("Romaji")
		expect(getMediaTitle({ id: 1, title: { native: "ネイティブ" } })).toBe("ネイティブ")
	})

	it("treats null and undefined languages like no preference", () => {
		expect(getMediaTitle({ id: 1, title }, null)).toBe("Shingeki no Kyojin")
		expect(getMediaTitle({ id: 1, title }, undefined)).toBe("Shingeki no Kyojin")
	})

	it("puts the field matching the language first, stylised variants included", () => {
		expect(getMediaTitle({ id: 1, title }, "ENGLISH")).toBe("Attack on Titan")
		expect(getMediaTitle({ id: 1, title }, "ENGLISH_STYLISED")).toBe("Attack on Titan")
		expect(getMediaTitle({ id: 1, title }, "ROMAJI")).toBe("Shingeki no Kyojin (romaji)")
		expect(getMediaTitle({ id: 1, title }, "ROMAJI_STYLISED")).toBe("Shingeki no Kyojin (romaji)")
		expect(getMediaTitle({ id: 1, title }, "NATIVE")).toBe("進撃の巨人")
		expect(getMediaTitle({ id: 1, title }, "NATIVE_STYLISED")).toBe("進撃の巨人")
	})

	it("falls back through the neutral order when the language field is missing", () => {
		const withoutEnglish = { ...title, english: null }
		expect(getMediaTitle({ id: 1, title: withoutEnglish }, "ENGLISH")).toBe("Shingeki no Kyojin")
		expect(getMediaTitle({ id: 1, title: { native: "ネイティブ" } }, "ENGLISH")).toBe("ネイティブ")
	})

	it("treats empty and whitespace-only strings as missing", () => {
		expect(getMediaTitle({ id: 1, title: { userPreferred: "", english: "English" } })).toBe("English")
		expect(getMediaTitle({ id: 1, title: { userPreferred: "   ", english: "  ", romaji: "Romaji" } })).toBe("Romaji")
		expect(getMediaTitle({ id: 1, title: { english: "", romaji: "Romaji" } }, "ENGLISH")).toBe("Romaji")
	})

	it("trims the title it returns", () => {
		expect(getMediaTitle({ id: 1, title: { userPreferred: "  Padded  " } })).toBe("Padded")
	})

	it("falls back to the anime id, then to a generic label", () => {
		expect(getMediaTitle({ id: 12, title: {} })).toBe("Anime #12")
		expect(getMediaTitle({ id: 12, title: null })).toBe("Anime #12")
		expect(getMediaTitle({ id: 12 })).toBe("Anime #12")
		expect(getMediaTitle({ title: { userPreferred: "" } })).toBe("Untitled anime")
		expect(getMediaTitle(null)).toBe("Untitled anime")
		expect(getMediaTitle(undefined, "NATIVE")).toBe("Untitled anime")
	})
})

describe("getMediaCover", () => {
	const cover = { extraLarge: "xl.jpg", large: "l.jpg", medium: "m.jpg" }

	it("prefers the biggest image for the large size, which is the default", () => {
		expect(getMediaCover({ coverImage: cover })).toBe("xl.jpg")
		expect(getMediaCover({ coverImage: cover }, "large")).toBe("xl.jpg")
		expect(getMediaCover({ coverImage: { large: "l.jpg", medium: "m.jpg" } })).toBe("l.jpg")
		expect(getMediaCover({ coverImage: { medium: "m.jpg" } })).toBe("m.jpg")
	})

	it("prefers the smallest image for the small size", () => {
		expect(getMediaCover({ coverImage: cover }, "small")).toBe("m.jpg")
		expect(getMediaCover({ coverImage: { extraLarge: "xl.jpg", large: "l.jpg" } }, "small")).toBe("l.jpg")
		expect(getMediaCover({ coverImage: { extraLarge: "xl.jpg" } }, "small")).toBe("xl.jpg")
	})

	it("prefers large, then medium, then extraLarge for the medium size", () => {
		expect(getMediaCover({ coverImage: cover }, "medium")).toBe("l.jpg")
		expect(getMediaCover({ coverImage: { extraLarge: "xl.jpg", medium: "m.jpg" } }, "medium")).toBe("m.jpg")
		expect(getMediaCover({ coverImage: { extraLarge: "xl.jpg" } }, "medium")).toBe("xl.jpg")
		expect(getMediaCover({ coverImage: { medium: "m.jpg" } }, "medium")).toBe("m.jpg")
	})

	it("skips empty strings and returns null when there is no cover", () => {
		expect(getMediaCover({ coverImage: { extraLarge: "", large: "l.jpg" } })).toBe("l.jpg")
		expect(getMediaCover({ coverImage: { extraLarge: null, large: null, medium: null } })).toBeNull()
		expect(getMediaCover({ coverImage: null })).toBeNull()
		expect(getMediaCover({})).toBeNull()
		expect(getMediaCover(null)).toBeNull()
	})
})

describe("sanitizeMediaDescription", () => {
	it("turns line breaks into spaces and strips tags", () => {
		expect(sanitizeMediaDescription("Line one<br>Line two<br/>Line <i>three</i><BR />four"))
			.toBe("Line one Line two Line three four")
	})

	it("decodes the entities AniList sends", () => {
		expect(sanitizeMediaDescription("Tom &amp; Jerry&#039;s &quot;show&quot; &mdash; &#x41;&hellip;"))
			.toBe("Tom & Jerry's \"show\" — A…")
	})

	it("keeps unknown entities as written and ignores invalid code points", () => {
		expect(sanitizeMediaDescription("&unknown; &#0;")).toBe("&unknown; &#0;")
	})

	it("collapses whitespace and trims", () => {
		expect(sanitizeMediaDescription("  A\n\n  B&nbsp;&nbsp;C  ")).toBe("A B C")
	})

	it("combines everything in one description", () => {
		expect(sanitizeMediaDescription("<i>Hero</i> &amp; friend&#039;s quest<br>Second line"))
			.toBe("Hero & friend's quest Second line")
	})

	it("returns an empty string for missing descriptions", () => {
		expect(sanitizeMediaDescription(null)).toBe("")
		expect(sanitizeMediaDescription(undefined)).toBe("")
		expect(sanitizeMediaDescription("")).toBe("")
	})
})

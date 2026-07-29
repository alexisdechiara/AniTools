import { describe, expect, it } from "vitest"
import {
	CREATE_PRESETS,
	calculateCoverCrop,
	getCreateExportFilename,
	getCreateMimeType,
	sanitizeCreateFilename,
	wrapCreateText
} from "../../app/utils/create-artwork"

describe("Create artwork presets", () => {
	it("defines every planned output with positive exact dimensions", () => {
		expect(Object.values(CREATE_PRESETS).map(preset => [
			preset.id,
			preset.width,
			preset.height
		])).toEqual([
			["story", 1080, 1920],
			["square", 1080, 1080],
			["badge", 512, 512],
			["anilist-thumbnail", 1000, 1500],
			["banner", 1500, 500]
		])
	})
})

describe("Create artwork crop", () => {
	it("centres and zooms a landscape image into a square", () => {
		expect(calculateCoverCrop(2000, 1000, 1000, 1000)).toEqual({
			sourceX: 500,
			sourceY: 0,
			sourceWidth: 1000,
			sourceHeight: 1000
		})
		expect(calculateCoverCrop(2000, 1000, 1000, 1000, 2)).toEqual({
			sourceX: 750,
			sourceY: 250,
			sourceWidth: 500,
			sourceHeight: 500
		})
	})

	it("clamps zoom and focal positions", () => {
		const crop = calculateCoverCrop(1000, 2000, 1500, 500, 99, -1, 2)

		expect(crop.sourceX).toBe(0)
		expect(crop.sourceY).toBeCloseTo(1888.8889)
		expect(crop.sourceWidth).toBeCloseTo(333.3333)
		expect(crop.sourceHeight).toBeCloseTo(111.1111)
	})
})

describe("Create artwork exports", () => {
	it("creates safe filenames and matching image MIME types", () => {
		expect(sanitizeCreateFilename("L'été d'Alexis / 2026")).toBe("l-ete-d-alexis-2026")
		expect(getCreateExportFilename("Top Anime", "story", "jpeg"))
			.toBe("top-anime-story.jpg")
		expect(getCreateMimeType("webp")).toBe("image/webp")
	})

	it("wraps text deterministically and marks truncation", () => {
		const measure = (value: string) => value.length

		expect(wrapCreateText("one two three four", 9, measure, 2))
			.toEqual(["one two", "three…"])
		expect(wrapCreateText("   ", 20, measure)).toEqual([])
	})
})

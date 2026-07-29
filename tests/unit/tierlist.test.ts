import { describe, expect, it } from "vitest"
import {
	bodyColWidthToClass,
	colWidthToClass,
	gapSizeToClass,
	gapSizeToText,
	getTierlistNeutralBackgrounds,
	nbColToClass,
	rowCornerToClass,
	tierlistDarkBackgrounds,
	tierlistLightBackgrounds
} from "../../app/utils/tierlist"

describe("tierlist presentation mappings", () => {
	it.each([
		[0, "xs", "gap-0"],
		[25, "sm", "gap-3"],
		[50, "md", "gap-6"],
		[75, "lg", "gap-12"],
		[100, "xl", "gap-24"]
	])("maps gap size %i", (size, label, className) => {
		expect(gapSizeToText(size)).toBe(label)
		expect(gapSizeToClass(size)).toBe(className)
	})

	it("uses stable fallbacks for unsupported values", () => {
		expect(gapSizeToText(42)).toBe("md")
		expect(gapSizeToClass(42)).toBe("gap-8")
		expect(rowCornerToClass(42)).toBe("rounded-2xl")
		expect(colWidthToClass(42)).toBe("col-span-1")
		expect(bodyColWidthToClass(42)).toBe("col-span-11")
		expect(nbColToClass(42)).toBe("grid-cols-10")
	})

	it("keeps heading and body column widths complementary", () => {
		for (let width = 0; width <= 4; width += 1) {
			const heading = Number.parseInt(colWidthToClass(width).replace("col-span-", ""), 10)
			const body = Number.parseInt(bodyColWidthToClass(width).replace("col-span-", ""), 10)

			expect(heading + body).toBe(12)
		}
	})

	it("maps every supported grid column count", () => {
		for (let count = 1; count <= 12; count += 1) {
			expect(nbColToClass(count)).toBe(`grid-cols-${count}`)
		}
	})

	it("returns the matching neutral palette for each theme", () => {
		expect(getTierlistNeutralBackgrounds("light")).toBe(tierlistLightBackgrounds)
		expect(getTierlistNeutralBackgrounds("dark")).toBe(tierlistDarkBackgrounds)
		expect(tierlistLightBackgrounds).toHaveLength(12)
		expect(tierlistDarkBackgrounds).toHaveLength(12)
	})
})

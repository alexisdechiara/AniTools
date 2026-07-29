import { describe, expect, it } from "vitest"
import type {
	TierlistEntry,
	TierlistSnapshot
} from "../../app/types/tierlist"
import {
	buildTierlistFilename,
	createTierlistJsonBlob,
	getTierlistExportEntryCount,
	planTierlistImageLayout,
	sanitizeTierlistFileStem
} from "../../app/utils/tierlist-export"

function entry(id: number): TierlistEntry {
	return {
		score: 80,
		media: {
			id,
			title: { userPreferred: `Anime ${id}` }
		}
	}
}

function snapshot(entryCount: number, columns = 10): TierlistSnapshot {
	return {
		tiers: [{
			id: "tier-a",
			name: "A",
			color: "bg-red-400",
			range: [80, 100],
			entries: Array.from({ length: entryCount }, (_, index) => entry(index + 1))
		}],
		unranked: [entry(entryCount + 1)],
		settings: {
			currentTemplate: 0,
			gapSize: 25,
			headingCorner: true,
			rowCorner: 6,
			colWidth: 0,
			selectedBackground: "bg-neutral-900",
			nbCol: columns
		}
	}
}

describe("tierlist export helpers", () => {
	it("builds safe and deterministic filenames", () => {
		const date = new Date("2026-07-29T12:00:00.000Z")
		expect(sanitizeTierlistFileStem("../../Ma Tier List !")).toBe("ma-tier-list")
		expect(buildTierlistFilename("json", date)).toBe("anitools-tierlist-2026-07-29.json")
		expect(buildTierlistFilename("jpeg", date, "Été 2026")).toBe("ete-2026-2026-07-29.jpg")
		expect(buildTierlistFilename("webp", date)).toBe("anitools-tierlist-2026-07-29.webp")
	})

	it("plans all lanes while respecting browser canvas limits", () => {
		const layout = planTierlistImageLayout(snapshot(1000, 12))
		expect(layout.columns).toBe(12)
		expect(layout.lanes.map(lane => lane.id)).toEqual(["tier-a", "unranked"])
		expect(layout.pixelWidth).toBeLessThanOrEqual(4096)
		expect(layout.pixelHeight).toBeLessThanOrEqual(8192)
		expect(layout.scale).toBeLessThanOrEqual(1)
	})

	it("creates a versioned JSON blob containing every snapshot entry", async () => {
		const data = snapshot(2)
		const blob = createTierlistJsonBlob(data, new Date("2026-07-29T12:00:00.000Z"))
		const parsed = JSON.parse(await blob.text()) as {
			kind: string
			version: number
			tiers: Array<{ entries: TierlistEntry[] }>
			unranked: TierlistEntry[]
		}

		expect(blob.type).toContain("application/json")
		expect(parsed.kind).toBe("anitools-tierlist")
		expect(parsed.version).toBe(1)
		expect(getTierlistExportEntryCount(data.tiers, data.unranked)).toBe(3)
	})
})

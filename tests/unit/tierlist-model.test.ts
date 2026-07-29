import { describe, expect, it } from "vitest"
import type {
	TierlistEntry,
	TierlistSnapshot,
	TierlistTier
} from "../../app/types/tierlist"
import {
	MAX_TIERLIST_PERSISTED_CHARACTERS,
	createTierlistDragPayload,
	createTierlistExportDocument,
	createTierlistSnapshot,
	compactTierlistEntry,
	deserializeTierlistState,
	formatMediaResultToTierlistEntry,
	getTierlistEntryId,
	normalizeTierlistTiers,
	parseTierlistClipboardEntry,
	parseTierlistDragPayload,
	parseTierlistExportText,
	sanitizeTierlistEntry,
	serializeTierlistState
} from "../../app/utils/tierlist-model"

function entry(id: number, overrides: Partial<TierlistEntry> = {}): TierlistEntry {
	return {
		status: "CURRENT",
		score: 80,
		media: {
			id,
			title: { userPreferred: `Anime ${id}` },
			coverImage: { large: `https://example.com/${id}.jpg` },
			genres: ["Action"]
		},
		...overrides
	}
}

function tier(id: string, entries: TierlistEntry[] = []): TierlistTier {
	return {
		id,
		name: id,
		color: "bg-neutral-500",
		range: [0, 100],
		entries
	}
}

function snapshot(entries: TierlistEntry[] = []): TierlistSnapshot {
	return {
		tiers: [tier("tier-a", entries)],
		unranked: [],
		settings: {
			currentTemplate: 0,
			gapSize: 25,
			headingCorner: true,
			rowCorner: 6,
			colWidth: 0,
			selectedBackground: "bg-neutral-900",
			nbCol: 10
		}
	}
}

describe("tierlist entry model", () => {
	it("uses media.id as the only stable anime identity", () => {
		const parsed = sanitizeTierlistEntry(entry(42))
		expect(parsed).not.toBeNull()
		expect(parsed && getTierlistEntryId(parsed)).toBe(42)
		expect(sanitizeTierlistEntry({ id: 42, media: null })).toBeNull()
	})

	it("reads mediaListEntry from the nested Media result", () => {
		const parsed = formatMediaResultToTierlistEntry({
			Media: {
				id: 7,
				title: { userPreferred: "Nested" },
				mediaListEntry: {
					status: "COMPLETED",
					score: 91,
					progress: 12
				}
			}
		})

		expect(parsed).toMatchObject({
			status: "COMPLETED",
			score: 91,
			progress: 12,
			media: { id: 7 }
		})
	})

	it("compacts persisted entries to the fields needed by the tier list", () => {
		const compact = compactTierlistEntry(entry(8, {
			media: {
				...entry(8).media,
				description: "Not needed after persistence",
				relations: {
					edges: [{ relationType: "SEQUEL", node: { id: 9 } }]
				}
			}
		}))

		expect(compact.media.id).toBe(8)
		expect(compact.media.title?.userPreferred).toBe("Anime 8")
		expect(compact.media.description).toBeUndefined()
		expect(compact.media.relations).toBeUndefined()
	})

	it("validates and bounds clipboard entries", () => {
		expect(parseTierlistClipboardEntry(JSON.stringify(entry(3)))?.media.id).toBe(3)
		expect(parseTierlistClipboardEntry("{not-json")).toBeNull()
		expect(parseTierlistClipboardEntry("x".repeat(100_001))).toBeNull()
		expect(parseTierlistClipboardEntry(JSON.stringify({
			...entry(4),
			media: {
				...entry(4).media,
				siteUrl: "javascript:alert(1)"
			}
		}))).toBeNull()
	})

	it("round-trips an internal drag payload without accepting arbitrary JSON", () => {
		const serialized = createTierlistDragPayload("tier-a", entry(9))
		expect(parseTierlistDragPayload(serialized)).toMatchObject({
			sourceLaneId: "tier-a",
			entry: { media: { id: 9 } }
		})
		expect(parseTierlistDragPayload(JSON.stringify(entry(9)))).toBeNull()
	})
})

describe("tierlist document validation", () => {
	it("adds stable ids to legacy tiers and resolves duplicate ids", () => {
		const normalized = normalizeTierlistTiers([
			{ name: "S", color: "bg-red-400", range: [90, 100], entries: [] },
			{ id: "same", name: "A", color: "#f97316", range: [80, 89], entries: [] },
			{ id: "same", name: "B", color: "#eab308", range: [70, 79], entries: [] }
		])

		expect(normalized).toHaveLength(3)
		expect(new Set(normalized.map(item => item.id)).size).toBe(3)
		expect(normalized[0]?.id).toContain("tier-template")
		expect(normalized[0]?.color).toBe("#f87171")
	})

	it("exports and imports a versioned AniTools document", () => {
		const document = createTierlistExportDocument(
			snapshot([entry(1)]),
			new Date("2026-07-29T12:00:00.000Z")
		)
		const parsed = parseTierlistExportText(JSON.stringify(document))

		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.kind).toBe("anitools-tierlist")
			expect(parsed.data.version).toBe(1)
			expect(parsed.data.tiers[0]?.entries[0]?.media.id).toBe(1)
		}
	})

	it("rejects unrelated, malformed and oversized documents", () => {
		expect(parseTierlistExportText("{}")).toEqual({
			success: false,
			error: "This is not a valid AniTools tier list export."
		})
		expect(parseTierlistExportText("x".repeat(5_000_001))).toEqual({
			success: false,
			error: "The selected file is too large."
		})
	})

	it("rejects documents above the global entry limit instead of truncating them", () => {
		const tooManyEntries = Array.from({ length: 501 }, (_, index) => entry(index + 1))
		const document = {
			...createTierlistExportDocument(snapshot()),
			tiers: [
				tier("tier-a", tooManyEntries),
				tier("tier-b", tooManyEntries.map((item, index) => ({
					...item,
					media: { ...item.media, id: index + 10_000 }
				})))
			]
		}

		expect(parseTierlistExportText(JSON.stringify(document))).toEqual({
			success: false,
			error: "The tier list contains too many entries."
		})
	})

	it("normalizes snapshots and removes duplicates inside a lane", () => {
		const normalized = createTierlistSnapshot({
			tiers: [tier("tier-a", [entry(1), entry(1), entry(2)])],
			unranked: [entry(3), entry(3)],
			settings: snapshot().settings
		})
		expect(normalized.tiers[0]?.entries.map(item => item.media.id)).toEqual([1, 2])
		expect(normalized.unranked.map(item => item.media.id)).toEqual([3])
	})

	it("keeps the persisted payload below the configured size limit", () => {
		const verboseEntries = Array.from({ length: 120 }, (_, index) =>
			entry(index + 1, {
				media: {
					...entry(index + 1).media,
					description: "a".repeat(20_000)
				}
			})
		)
		const serialized = serializeTierlistState({
			tiers: [tier("tier-a", verboseEntries)],
			unrankedTier: [],
			...snapshot().settings
		})

		expect(serialized.length).toBeLessThanOrEqual(MAX_TIERLIST_PERSISTED_CHARACTERS)
		const deserialized = deserializeTierlistState(serialized)
		expect(deserialized.tiers).toBeDefined()
		expect(JSON.stringify(deserialized)).not.toContain("\"description\"")
		expect(deserializeTierlistState("invalid")).toEqual({})
	})
})

import * as z from "zod"
import type {
	TierlistEntry,
	TierlistExportDocument,
	TierlistSettings,
	TierlistSnapshot,
	TierlistTier
} from "~/types/tierlist"

export const TIERLIST_EXPORT_KIND = "anitools-tierlist" as const
export const TIERLIST_EXPORT_VERSION = 1 as const
export const MAX_TIERLIST_TIERS = 30
export const MAX_TIERLIST_ENTRIES = 1000
export const MAX_TIERLIST_ENTRIES_PER_LANE = MAX_TIERLIST_ENTRIES
export const MAX_TIERLIST_IMPORT_BYTES = 5_000_000
export const MAX_TIERLIST_PERSISTED_CHARACTERS = 1_500_000

const shortTextSchema = z.string().trim().max(160)
const nullableShortTextSchema = shortTextSchema.nullish()
const safeUrlSchema = z.string().trim().max(2048).refine((value) => {
	try {
		return new URL(value).protocol === "https:"
	} catch {
		return false
	}
}, "Only HTTPS URLs are allowed.")
const urlTextSchema = safeUrlSchema.nullish()
const finiteNumberSchema = z.number().finite()
const tierColorSchema = z.string().trim().refine(
	value =>
		/^#[0-9a-f]{3,8}$/i.test(value)
		|| /^(?:bg-(?:black|white|neutral-(?:50|100|200|300|400|500|600|700|800|900|950)|red-400|orange-400|yellow-400|green-500|blue-400|indigo-400|violet-500))$/.test(value),
	"Unsupported tier color."
)
const backgroundSchema = z.enum([
	"bg-transparent",
	"bg-white",
	"bg-neutral-50",
	"bg-neutral-100",
	"bg-neutral-200",
	"bg-neutral-300",
	"bg-neutral-400",
	"bg-neutral-500",
	"bg-neutral-600",
	"bg-neutral-700",
	"bg-neutral-800",
	"bg-neutral-900",
	"bg-neutral-950"
])
const legacyTierColors: Readonly<Record<string, string>> = {
	"bg-black": "#000000",
	"bg-white": "#ffffff",
	"bg-neutral-50": "#fafafa",
	"bg-neutral-100": "#f5f5f5",
	"bg-neutral-200": "#e5e5e5",
	"bg-neutral-300": "#d4d4d4",
	"bg-neutral-400": "#a3a3a3",
	"bg-neutral-500": "#737373",
	"bg-neutral-600": "#525252",
	"bg-neutral-700": "#404040",
	"bg-neutral-800": "#262626",
	"bg-neutral-900": "#171717",
	"bg-neutral-950": "#0a0a0a",
	"bg-red-400": "#f87171",
	"bg-orange-400": "#fb923c",
	"bg-yellow-400": "#facc15",
	"bg-green-500": "#22c55e",
	"bg-blue-400": "#60a5fa",
	"bg-indigo-400": "#818cf8",
	"bg-violet-500": "#8b5cf6"
}

const dateSchema = z.object({
	year: z.number().int().min(1900).max(3000).nullish(),
	month: z.number().int().min(1).max(12).nullish(),
	day: z.number().int().min(1).max(31).nullish()
})

const titleSchema = z.object({
	romaji: nullableShortTextSchema,
	english: nullableShortTextSchema,
	native: nullableShortTextSchema,
	userPreferred: nullableShortTextSchema
})

const coverImageSchema = z.object({
	medium: urlTextSchema,
	large: urlTextSchema,
	extraLarge: urlTextSchema,
	color: z.string().trim().max(32).nullish()
})

const relationNodeSchema = z.object({
	id: z.number().int().positive(),
	format: nullableShortTextSchema,
	title: titleSchema.nullish()
})

const relationEdgeSchema = z.object({
	relationType: nullableShortTextSchema,
	node: relationNodeSchema.nullish()
})

const mediaSchema = z.object({
	id: z.number().int().positive(),
	title: titleSchema.nullish(),
	coverImage: coverImageSchema.nullish(),
	relations: z.object({
		edges: z.array(relationEdgeSchema).max(128).nullish()
	}).nullish(),
	siteUrl: urlTextSchema,
	format: nullableShortTextSchema,
	status: nullableShortTextSchema,
	season: nullableShortTextSchema,
	seasonYear: z.number().int().min(1900).max(3000).nullish(),
	startDate: dateSchema.nullish(),
	endDate: dateSchema.nullish(),
	episodes: z.number().int().nonnegative().max(100_000).nullish(),
	duration: z.number().int().nonnegative().max(100_000).nullish(),
	averageScore: finiteNumberSchema.min(0).max(100).nullish(),
	meanScore: finiteNumberSchema.min(0).max(100).nullish(),
	favourites: z.number().int().nonnegative().nullish(),
	genres: z.array(shortTextSchema).max(40).nullish()
})

export const tierlistEntrySchema = z.object({
	status: nullableShortTextSchema,
	score: finiteNumberSchema.min(0).max(100).nullish(),
	repeat: z.number().int().nonnegative().max(100_000).nullish(),
	progress: z.number().int().nonnegative().max(100_000).nullish(),
	updatedAt: z.number().int().nonnegative().nullish(),
	startedAt: dateSchema.nullish(),
	completedAt: dateSchema.nullish(),
	locked: z.boolean().optional(),
	media: mediaSchema
})

const tierSchema = z.object({
	id: z.string().trim().min(1).max(120),
	name: z.string().trim().min(1).max(80),
	color: tierColorSchema,
	range: z.tuple([
		finiteNumberSchema.min(0).max(100),
		finiteNumberSchema.min(0).max(100)
	]).refine(([minimum, maximum]) => minimum <= maximum),
	entries: z.array(tierlistEntrySchema).max(MAX_TIERLIST_ENTRIES_PER_LANE)
})

const settingsSchema = z.object({
	currentTemplate: z.number().int().min(-1).max(100).catch(-1),
	gapSize: z.number().int().min(0).max(100).catch(25),
	headingCorner: z.boolean().catch(true),
	rowCorner: z.number().int().min(0).max(6).catch(6),
	colWidth: z.number().int().min(0).max(4).catch(0),
	selectedBackground: backgroundSchema.catch("bg-neutral-100"),
	nbCol: z.number().int().min(1).max(12).catch(10)
})

const exportDocumentSchema = z.object({
	kind: z.literal(TIERLIST_EXPORT_KIND),
	version: z.literal(TIERLIST_EXPORT_VERSION),
	exportedAt: z.iso.datetime(),
	tiers: z.array(tierSchema).max(MAX_TIERLIST_TIERS),
	unranked: z.array(tierlistEntrySchema).max(MAX_TIERLIST_ENTRIES_PER_LANE),
	settings: settingsSchema
})

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function uniqueEntries(entries: TierlistEntry[]): TierlistEntry[] {
	const mediaIds = new Set<number>()
	return entries.filter((entry) => {
		if (mediaIds.has(entry.media.id)) return false
		mediaIds.add(entry.media.id)
		return true
	})
}

export function compactTierlistEntry(entry: TierlistEntry): TierlistEntry {
	return {
		status: entry.status,
		score: entry.score,
		repeat: entry.repeat,
		progress: entry.progress,
		updatedAt: entry.updatedAt,
		startedAt: entry.startedAt,
		completedAt: entry.completedAt,
		locked: entry.locked,
		media: {
			id: entry.media.id,
			title: entry.media.title,
			coverImage: entry.media.coverImage,
			siteUrl: entry.media.siteUrl,
			format: entry.media.format,
			status: entry.media.status,
			season: entry.media.season,
			seasonYear: entry.media.seasonYear,
			startDate: entry.media.startDate,
			endDate: entry.media.endDate,
			episodes: entry.media.episodes,
			duration: entry.media.duration,
			averageScore: entry.media.averageScore,
			meanScore: entry.media.meanScore,
			favourites: entry.media.favourites,
			genres: entry.media.genres
		}
	}
}

function compactSnapshot(snapshot: TierlistSnapshot): TierlistSnapshot {
	return {
		...snapshot,
		tiers: snapshot.tiers.map(tier => ({
			...tier,
			entries: tier.entries.map(compactTierlistEntry)
		})),
		unranked: snapshot.unranked.map(compactTierlistEntry)
	}
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch {
		return null
	}
}

export function getTierlistEntryId(entry: TierlistEntry): number {
	return entry.media.id
}

export function getTierlistEntryTitle(entry: TierlistEntry): string {
	return entry.media.title?.userPreferred
		?? entry.media.title?.english
		?? entry.media.title?.romaji
		?? entry.media.title?.native
		?? `Anime ${entry.media.id}`
}

export function sanitizeTierlistEntry(input: unknown): TierlistEntry | null {
	const result = tierlistEntrySchema.safeParse(input)
	return result.success ? result.data : null
}

export function formatMediaResultToTierlistEntry(input: unknown): TierlistEntry | null {
	if (!isRecord(input)) return null

	const mediaCandidate = isRecord(input.Media) ? input.Media : input
	const listEntry = isRecord(mediaCandidate.mediaListEntry)
		? mediaCandidate.mediaListEntry
		: {}

	return sanitizeTierlistEntry({
		...listEntry,
		media: mediaCandidate
	})
}

export function createTemplateTierId(templateIndex: number, tierIndex: number, name: string): string {
	const slug = name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 32)

	return `tier-template-${templateIndex}-${tierIndex}-${slug || "tier"}`
}

let customTierCounter = 0

export function createCustomTierId(): string {
	if (globalThis.crypto?.randomUUID) {
		return `tier-${globalThis.crypto.randomUUID()}`
	}

	customTierCounter += 1
	return `tier-${Date.now().toString(36)}-${customTierCounter.toString(36)}`
}

function normalizeTier(input: unknown, index: number, scope: string): TierlistTier | null {
	if (!isRecord(input)) return null

	const fallbackId = createTemplateTierId(-1, index, String(input.name ?? `${scope}-${index + 1}`))
	const parsed = tierSchema.safeParse({
		...input,
		id: typeof input.id === "string" && input.id.trim() ? input.id : fallbackId,
		color: typeof input.color === "string"
			? legacyTierColors[input.color] ?? input.color
			: input.color,
		entries: Array.isArray(input.entries)
			? input.entries
				.slice(0, MAX_TIERLIST_ENTRIES_PER_LANE)
				.map(sanitizeTierlistEntry)
				.filter((entry): entry is TierlistEntry => entry !== null)
			: []
	})

	if (!parsed.success) return null
	return {
		...parsed.data,
		entries: uniqueEntries(parsed.data.entries)
	}
}

export function normalizeTierlistTiers(input: unknown, scope = "import"): TierlistTier[] {
	if (!Array.isArray(input)) return []

	const ids = new Set<string>()
	return input
		.slice(0, MAX_TIERLIST_TIERS)
		.map((tier, index) => normalizeTier(tier, index, scope))
		.filter((tier): tier is TierlistTier => tier !== null)
		.map((tier, index) => {
			const id = ids.has(tier.id)
				? createTemplateTierId(-1, index, `${tier.name}-${index}`)
				: tier.id
			ids.add(id)
			return { ...tier, id }
		})
}

export function normalizeTierlistSettings(input: unknown): TierlistSettings {
	const parsed = settingsSchema.safeParse(input)
	if (parsed.success) return parsed.data

	return {
		currentTemplate: -1,
		gapSize: 25,
		headingCorner: true,
		rowCorner: 6,
		colWidth: 0,
		selectedBackground: "bg-neutral-100",
		nbCol: 10
	}
}

function countSnapshotEntries(snapshot: Pick<TierlistSnapshot, "tiers" | "unranked">): number {
	return snapshot.unranked.length
		+ snapshot.tiers.reduce((total, tier) => total + tier.entries.length, 0)
}

function capSnapshotEntries(snapshot: TierlistSnapshot): TierlistSnapshot {
	let remaining = MAX_TIERLIST_ENTRIES
	const tiers = snapshot.tiers.map((tier) => {
		const entries = tier.entries.slice(0, Math.min(remaining, MAX_TIERLIST_ENTRIES_PER_LANE))
		remaining -= entries.length
		return { ...tier, entries }
	})
	const unranked = snapshot.unranked.slice(0, Math.min(remaining, MAX_TIERLIST_ENTRIES_PER_LANE))

	return { ...snapshot, tiers, unranked }
}

export function createTierlistSnapshot(input: {
	tiers: unknown
	unranked: unknown
	settings: unknown
}): TierlistSnapshot {
	const tiers = normalizeTierlistTiers(input.tiers)
	const unranked = Array.isArray(input.unranked)
		? uniqueEntries(
			input.unranked
				.slice(0, MAX_TIERLIST_ENTRIES_PER_LANE)
				.map(sanitizeTierlistEntry)
				.filter((entry): entry is TierlistEntry => entry !== null)
		)
		: []

	return capSnapshotEntries({
		tiers,
		unranked,
		settings: normalizeTierlistSettings(input.settings)
	})
}

export function createTierlistExportDocument(
	snapshot: TierlistSnapshot,
	exportedAt = new Date()
): TierlistExportDocument {
	const cappedSnapshot = compactSnapshot(capSnapshotEntries(snapshot))
	return {
		kind: TIERLIST_EXPORT_KIND,
		version: TIERLIST_EXPORT_VERSION,
		exportedAt: exportedAt.toISOString(),
		...cappedSnapshot
	}
}

export type TierlistExportParseResult =
	| { success: true, data: TierlistExportDocument }
	| { success: false, error: string }

export function parseTierlistExportText(text: string): TierlistExportParseResult {
	if (!text.trim()) {
		return { success: false, error: "The selected file is empty." }
	}
	if (new TextEncoder().encode(text).byteLength > MAX_TIERLIST_IMPORT_BYTES) {
		return { success: false, error: "The selected file is too large." }
	}

	const parsedJson = parseJson(text)
	const parsedDocument = exportDocumentSchema.safeParse(parsedJson)
	if (!parsedDocument.success) {
		return { success: false, error: "This is not a valid AniTools tier list export." }
	}
	if (countSnapshotEntries(parsedDocument.data) > MAX_TIERLIST_ENTRIES) {
		return { success: false, error: "The tier list contains too many entries." }
	}

	const normalized = createTierlistSnapshot(parsedDocument.data)

	return {
		success: true,
		data: {
			kind: TIERLIST_EXPORT_KIND,
			version: TIERLIST_EXPORT_VERSION,
			exportedAt: parsedDocument.data.exportedAt,
			...normalized
		}
	}
}

export function parseTierlistClipboardEntry(text: string): TierlistEntry | null {
	if (!text.trim() || new TextEncoder().encode(text).byteLength > 100_000) return null
	return sanitizeTierlistEntry(parseJson(text))
}

export interface TierlistDragPayload {
	sourceLaneId: string
	entry: TierlistEntry
}

export function createTierlistDragPayload(
	sourceLaneId: string,
	entry: TierlistEntry
): string {
	return JSON.stringify({
		kind: "anitools-tierlist-entry",
		sourceLaneId,
		entry
	})
}

export function parseTierlistDragPayload(text: string): TierlistDragPayload | null {
	if (!text.trim() || new TextEncoder().encode(text).byteLength > 100_000) return null
	const parsed = parseJson(text)
	if (
		!isRecord(parsed)
		|| parsed.kind !== "anitools-tierlist-entry"
		|| typeof parsed.sourceLaneId !== "string"
		|| parsed.sourceLaneId.length === 0
		|| parsed.sourceLaneId.length > 120
	) return null

	const entry = sanitizeTierlistEntry(parsed.entry)
	return entry ? { sourceLaneId: parsed.sourceLaneId, entry } : null
}

function persistenceSnapshotFromState(input: Record<string, unknown>): Record<string, unknown> {
	const snapshot = compactSnapshot(createTierlistSnapshot({
		tiers: input.tiers,
		unranked: input.unrankedTier,
		settings: {
			currentTemplate: input.currentTemplate,
			gapSize: input.gapSize,
			headingCorner: input.headingCorner,
			rowCorner: input.rowCorner,
			colWidth: input.colWidth,
			selectedBackground: input.selectedBackground,
			nbCol: input.nbCol
		}
	}))

	return {
		currentTemplate: snapshot.settings.currentTemplate,
		tiers: snapshot.tiers,
		unrankedTier: snapshot.unranked,
		gapSize: snapshot.settings.gapSize,
		headingCorner: snapshot.settings.headingCorner,
		rowCorner: snapshot.settings.rowCorner,
		colWidth: snapshot.settings.colWidth,
		selectedBackground: snapshot.settings.selectedBackground,
		nbCol: snapshot.settings.nbCol
	}
}

export function serializeTierlistState(input: Record<string, unknown>): string {
	const persisted = persistenceSnapshotFromState(input)
	let serialized = JSON.stringify(persisted)
	if (serialized.length <= MAX_TIERLIST_PERSISTED_CHARACTERS) return serialized

	const tiers = normalizeTierlistTiers(persisted.tiers, "persist")
	const unranked = Array.isArray(persisted.unrankedTier)
		? persisted.unrankedTier
			.map(sanitizeTierlistEntry)
			.filter((entry): entry is TierlistEntry => entry !== null)
		: []

	while (serialized.length > MAX_TIERLIST_PERSISTED_CHARACTERS) {
		if (unranked.length > 0) {
			unranked.pop()
		} else {
			const tierWithEntries = [...tiers].reverse().find(tier => tier.entries.length > 0)
			if (!tierWithEntries) break
			tierWithEntries.entries.pop()
		}
		serialized = JSON.stringify({
			...persisted,
			tiers,
			unrankedTier: unranked
		})
	}

	return serialized
}

export function deserializeTierlistState(text: string): Record<string, unknown> {
	const parsed = parseJson(text)
	return isRecord(parsed) ? persistenceSnapshotFromState(parsed) : {}
}

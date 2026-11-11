import { z } from "zod"
import type { AniListMediaSummary } from "~~/shared/types/anilist"
import { selectExploreRelationEdge } from "~/utils/explore"
import { getMediaTitle, type MediaTitleLike } from "~/utils/media-display"

export const EXPLORE_PICKS_STORAGE_KEY = "anitools:explore-picks:v1"
export const EXPLORE_PICKS_VERSION = 1
export const EXPLORE_PICKS_EXPORT_KIND = "anitools-explore-picks"
export const MAX_EXPLORE_INTERESTED = 100
export const MAX_EXPLORE_PASSED = 1_000
export const MAX_EXPLORE_PROFILES = 5
export const MAX_EXPLORE_PICKS_CHARACTERS = 200_000

const PASSED_TRIM_STEP = 50
const MAX_IDENTITY_LENGTH = 200
const MIN_SEASON_YEAR = 1900
const MAX_SEASON_YEAR = 2200

/** What the Interested deck reads from a media, and nothing else. */
export interface ExplorePickMedia {
	id: number
	title: {
		english: string | null
		native: string | null
		romaji: string | null
		userPreferred: string | null
	} | null
	coverImage: {
		extraLarge: string | null
		large: string | null
		medium: string | null
	} | null
	siteUrl: string | null
	format: string | null
	seasonYear: number | null
	isAdult: boolean | null
	/** At most one edge: the one the relation badge describes. */
	relations: {
		edges: Array<{
			relationType: string | null
			node: {
				id: number
				format: string | null
				title: ExplorePickMedia["title"]
			} | null
		}>
	} | null
}

export interface ExplorePicksProfile {
	/** Milliseconds since the epoch of the last change. */
	updatedAt: number
	/** Oldest first. */
	interested: ExplorePickMedia[]
	/** Oldest first. Never contains the id of an interested title. */
	passed: number[]
}

export interface ExplorePicksState {
	version: typeof EXPLORE_PICKS_VERSION
	profiles: Record<string, ExplorePicksProfile>
}

export interface ExplorePicksExportDocument {
	kind: typeof EXPLORE_PICKS_EXPORT_KIND
	version: typeof EXPLORE_PICKS_VERSION
	exportedAt: string
	media: Array<{ id: number, title: string, url: string }>
}

export interface ProfileIdentityInput {
	isAuthenticated: boolean
	authMode: string | null | undefined
	username: string | null | undefined
}

/**
 * The key that tells two AniList profiles apart on this device. The Entries store and the
 * Explore picks both use it, so a profile switch resets them together.
 */
export function getProfileIdentityKey(input: ProfileIdentityInput): string | null {
	if (!input.isAuthenticated || !input.username) return null
	return `${input.authMode ?? "anonymous"}:${input.username}`
}

const idSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const textSchema = z.string().max(500).nullable()
const httpsUrlSchema = z.string().max(500).startsWith("https://").nullable()
const titleSchema = z.object({
	english: textSchema,
	native: textSchema,
	romaji: textSchema,
	userPreferred: textSchema
}).nullable()

const pickMediaSchema = z.object({
	id: idSchema,
	title: titleSchema,
	coverImage: z.object({
		extraLarge: httpsUrlSchema,
		large: httpsUrlSchema,
		medium: httpsUrlSchema
	}).nullable(),
	siteUrl: httpsUrlSchema,
	format: z.string().max(40).nullable(),
	seasonYear: z.number().int().min(MIN_SEASON_YEAR).max(MAX_SEASON_YEAR).nullable(),
	isAdult: z.boolean().nullable(),
	relations: z.object({
		edges: z.array(z.object({
			relationType: z.string().max(40).nullable(),
			node: z.object({
				id: idSchema,
				format: z.string().max(40).nullable(),
				title: titleSchema
			}).nullable()
		})).max(1)
	}).nullable()
})

const profileSchema = z.object({
	updatedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
	interested: z.array(pickMediaSchema).max(MAX_EXPLORE_INTERESTED * 5),
	passed: z.array(idSchema).max(MAX_EXPLORE_PASSED * 5)
})

const stateSchema = z.object({
	version: z.literal(EXPLORE_PICKS_VERSION),
	profiles: z.record(z.string().min(1).max(MAX_IDENTITY_LENGTH), profileSchema)
})

function text(value: unknown, maximum = 500): string | null {
	return typeof value === "string" && value.length <= maximum ? value : null
}

function httpsUrl(value: unknown): string | null {
	const url = text(value)
	return url?.startsWith("https://") ? url : null
}

function compactTitle(title: MediaTitleLike | null | undefined): ExplorePickMedia["title"] {
	if (!title) return null
	return {
		english: text(title.english),
		native: text(title.native),
		romaji: text(title.romaji),
		userPreferred: text(title.userPreferred)
	}
}

/** Reduces a media to the fields the Interested deck reads. Compacting twice changes nothing. */
export function compactExploreMedia(
	media: AniListMediaSummary | ExplorePickMedia
): ExplorePickMedia {
	const edge = selectExploreRelationEdge(media)

	return {
		id: media.id,
		title: compactTitle(media.title),
		coverImage: media.coverImage
			? {
					extraLarge: httpsUrl(media.coverImage.extraLarge),
					large: httpsUrl(media.coverImage.large),
					medium: httpsUrl(media.coverImage.medium)
				}
			: null,
		siteUrl: httpsUrl(media.siteUrl),
		format: text(media.format, 40),
		seasonYear: typeof media.seasonYear === "number"
			&& Number.isInteger(media.seasonYear)
			&& media.seasonYear >= MIN_SEASON_YEAR
			&& media.seasonYear <= MAX_SEASON_YEAR
			? media.seasonYear
			: null,
		isAdult: media.isAdult ?? null,
		relations: edge?.node
			? {
					edges: [{
						relationType: text(edge.relationType, 40),
						node: {
							id: edge.node.id,
							format: text(edge.node.format, 40),
							title: compactTitle(edge.node.title)
						}
					}]
				}
			: null
	}
}

export function createEmptyExplorePicksState(): ExplorePicksState {
	return { version: EXPLORE_PICKS_VERSION, profiles: {} }
}

export function createEmptyExplorePicksProfile(updatedAt = 0): ExplorePicksProfile {
	return { updatedAt, interested: [], passed: [] }
}

export function isExplorePicksProfileEmpty(profile: ExplorePicksProfile): boolean {
	return profile.interested.length === 0 && profile.passed.length === 0
}

/** Keeps the last occurrence of each key, in the order of those last occurrences. */
function uniqueNewest<T>(items: readonly T[], key: (item: T) => number): T[] {
	const seen = new Set<number>()
	const kept: T[] = []
	for (let index = items.length - 1; index >= 0; index -= 1) {
		const item = items[index] as T
		if (seen.has(key(item))) continue
		seen.add(key(item))
		kept.push(item)
	}
	return kept.reverse()
}

/**
 * Enforces the profile invariants: no duplicate id, a title is never both passed and interested
 * (the pass wins, so a stale pick cannot resurface), and both lists keep only their newest items.
 */
export function normalizeExplorePicksProfile(profile: ExplorePicksProfile): ExplorePicksProfile {
	const passed = uniqueNewest(profile.passed, id => id).slice(-MAX_EXPLORE_PASSED)
	const passedIds = new Set(profile.passed)
	const interested = uniqueNewest(profile.interested, media => media.id)
		.filter(media => !passedIds.has(media.id))
		.slice(-MAX_EXPLORE_INTERESTED)

	return { updatedAt: profile.updatedAt, interested, passed }
}

type ProfileEntry = [identity: string, profile: ExplorePicksProfile]

function sortOldestFirst(profiles: readonly ProfileEntry[]): ProfileEntry[] {
	return profiles.toSorted(([leftKey, left], [rightKey, right]) =>
		left.updatedAt - right.updatedAt || leftKey.localeCompare(rightKey)
	)
}

// Object.fromEntries defines own properties, so no stored key can reach the prototype.
function stateFromEntries(profiles: readonly ProfileEntry[]): ExplorePicksState {
	return { version: EXPLORE_PICKS_VERSION, profiles: Object.fromEntries(profiles) }
}

/** Normalizes every profile, drops the empty ones and keeps the most recently updated ones. */
export function normalizeExplorePicksState(state: ExplorePicksState): ExplorePicksState {
	const profiles = Object.entries(state.profiles)
		.map(([identity, profile]): ProfileEntry => [identity, normalizeExplorePicksProfile(profile)])
		.filter(([, profile]) => !isExplorePicksProfileEmpty(profile))

	return stateFromEntries(sortOldestFirst(profiles).slice(-MAX_EXPLORE_PROFILES))
}

export function getExplorePicksProfile(
	state: ExplorePicksState,
	identity: string
): ExplorePicksProfile {
	const profile = Object.hasOwn(state.profiles, identity) ? state.profiles[identity] : undefined
	return profile
		? { updatedAt: profile.updatedAt, interested: [...profile.interested], passed: [...profile.passed] }
		: createEmptyExplorePicksProfile()
}

/** Replaces one profile (an empty one is removed) and re-applies the caps. */
export function setExplorePicksProfile(
	state: ExplorePicksState,
	identity: string,
	profile: ExplorePicksProfile
): ExplorePicksState {
	if (!identity || identity.length > MAX_IDENTITY_LENGTH) return normalizeExplorePicksState(state)

	return normalizeExplorePicksState(stateFromEntries([
		...Object.entries(state.profiles).filter(([key]) => key !== identity),
		[identity, profile]
	]))
}

/** A right swipe: the title becomes the newest pick and stops being passed. */
export function addExplorePick(
	profile: ExplorePicksProfile,
	media: AniListMediaSummary | ExplorePickMedia,
	now: number
): ExplorePicksProfile {
	return normalizeExplorePicksProfile({
		updatedAt: now,
		interested: [...profile.interested, compactExploreMedia(media)],
		passed: profile.passed.filter(id => id !== media.id)
	})
}

/** A left swipe: the id becomes the newest pass and stops being a pick. */
export function addExplorePass(
	profile: ExplorePicksProfile,
	mediaId: number,
	now: number
): ExplorePicksProfile {
	return normalizeExplorePicksProfile({
		updatedAt: now,
		interested: profile.interested.filter(media => media.id !== mediaId),
		passed: [...profile.passed, mediaId]
	})
}

/** Forgets a decision: the title is neither a pick nor a pass and can be suggested again. */
export function restoreExploreDecision(
	profile: ExplorePicksProfile,
	mediaId: number,
	now: number
): ExplorePicksProfile {
	const interested = profile.interested.filter(media => media.id !== mediaId)
	const passed = profile.passed.filter(id => id !== mediaId)
	if (interested.length === profile.interested.length && passed.length === profile.passed.length) {
		return profile
	}
	return { updatedAt: now, interested, passed }
}

/** Drops the picks that are now on the user's AniList list. Returns the same profile if none is. */
export function dropListedExplorePicks(
	profile: ExplorePicksProfile,
	listedMediaIds: ReadonlySet<number>,
	now: number
): ExplorePicksProfile {
	const interested = profile.interested.filter(media => !listedMediaIds.has(media.id))
	if (interested.length === profile.interested.length) return profile
	return { updatedAt: now, interested, passed: profile.passed }
}

/**
 * Serializes within the character budget. Over budget, the least recently updated profile loses
 * its oldest picks, then its oldest passes, then disappears, before a newer profile is touched.
 */
export function serializeExplorePicksState(state: ExplorePicksState): string {
	const normalized = normalizeExplorePicksState(state)
	let serialized = JSON.stringify(normalized)
	if (serialized.length <= MAX_EXPLORE_PICKS_CHARACTERS) return serialized

	// Mutable copies, oldest profile first: trimming never touches the caller's arrays.
	let remaining = sortOldestFirst(Object.entries(normalized.profiles)).map(
		([identity, profile]): ProfileEntry => [identity, {
			updatedAt: profile.updatedAt,
			interested: [...profile.interested],
			passed: [...profile.passed]
		}]
	)

	while (remaining.length > 0) {
		const oldest = (remaining[0] as ProfileEntry)[1]
		while (serialized.length > MAX_EXPLORE_PICKS_CHARACTERS && !isExplorePicksProfileEmpty(oldest)) {
			if (oldest.interested.length > 0) oldest.interested.shift()
			else oldest.passed.splice(0, PASSED_TRIM_STEP)
			serialized = JSON.stringify(stateFromEntries(remaining))
		}
		if (serialized.length <= MAX_EXPLORE_PICKS_CHARACTERS) {
			// Normalizing again removes a profile that trimming left empty.
			return JSON.stringify(normalizeExplorePicksState(stateFromEntries(remaining)))
		}
		remaining = remaining.slice(1)
		serialized = JSON.stringify(stateFromEntries(remaining))
	}

	return serialized
}

/** Reads a stored value. Anything unexpected (bad JSON, shape, version or size) is an empty state. */
export function parseExplorePicksState(value: string | null | undefined): ExplorePicksState {
	if (typeof value !== "string" || value.length > MAX_EXPLORE_PICKS_CHARACTERS) {
		return createEmptyExplorePicksState()
	}

	try {
		const parsed = stateSchema.safeParse(JSON.parse(value))
		return parsed.success
			? normalizeExplorePicksState(parsed.data)
			: createEmptyExplorePicksState()
	} catch {
		return createEmptyExplorePicksState()
	}
}

export function getExplorePickUrl(media: Pick<ExplorePickMedia, "id" | "siteUrl">): string {
	return media.siteUrl ?? `https://anilist.co/anime/${media.id}`
}

type PickTitleGetter = (media: Pick<ExplorePickMedia, "id" | "title">) => string

export function buildExplorePicksExport(
	media: readonly ExplorePickMedia[],
	exportedAt: Date,
	getTitle: PickTitleGetter = getMediaTitle
): ExplorePicksExportDocument {
	return {
		kind: EXPLORE_PICKS_EXPORT_KIND,
		version: EXPLORE_PICKS_VERSION,
		exportedAt: exportedAt.toISOString(),
		media: media.map(item => ({
			id: item.id,
			title: getTitle(item),
			url: getExplorePickUrl(item)
		}))
	}
}

/** One AniList link per line. */
export function buildExplorePicksLinks(media: readonly ExplorePickMedia[]): string {
	return media.map(getExplorePickUrl).join("\n")
}

export function getExplorePicksExportFilename(exportedAt: Date): string {
	return `anitools-explore-picks-${exportedAt.toISOString().slice(0, 10)}.json`
}

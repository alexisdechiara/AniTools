import { createHash } from "node:crypto"

/**
 * Caching around the single AniList request path (`requestAniList`).
 *
 * - Development: a disk cache under `.data/anilist-dev-cache` (Nitro `devStorage`, never part
 *   of a production build). Each read query is fetched once and then replayed forever, so
 *   reloading pages while working on the UI costs no AniList quota. Data is intentionally
 *   frozen: clear the folder, or set NUXT_ANILIST_DEV_CACHE=off, to see fresh data.
 * - Every environment: a short in-memory cache plus in-flight deduplication, so identical
 *   reads from several pages, tabs or visitors share one upstream request.
 *
 * Mutations are never cached, and injected fetchers (unit tests) always bypass both layers.
 */

export type AniListDevCacheMode = "off" | "record" | "replay"

export const ANILIST_DEV_CACHE_STORAGE = "anilist-dev-cache"

/** Read queries: user lists and statistics change often, catalogue data rarely. */
export const ANILIST_CACHE_TTL = {
	user: 60_000,
	catalogue: 10 * 60_000
} as const

const MAX_MEMORY_ENTRIES = 300

export function resolveAniListDevCacheMode(
	isDev: boolean,
	setting: string | undefined
): AniListDevCacheMode {
	if (!isDev) return "off"
	if (setting === "off" || setting === "replay") return setting
	return "record"
}

export function isAniListMutation(query: string): boolean {
	return /^\s*mutation\b/.test(query)
}

function stableStringify(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
		return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`
	}
	return JSON.stringify(value)
}

/**
 * `viewer` scopes OAuth reads to their user (`oauth:<id>`); public reads share `public`.
 * The key is `<viewer>:<sha256>`: the prefix lets one viewer's entries be dropped without
 * touching anyone else's. The access token itself never enters the key, so it never reaches
 * the cache or the disk.
 */
export function buildAniListCacheKey(
	query: string,
	variables: Record<string, unknown>,
	viewer: string
): string {
	const hash = createHash("sha256")
		.update(stableStringify({ query: query.replace(/\s+/g, " ").trim(), variables, viewer }))
		.digest("hex")
	return `${viewer}:${hash}`
}

interface MemoryEntry {
	data: unknown
	expiresAt: number
}

export function createAniListMemoryCache(maxEntries = MAX_MEMORY_ENTRIES) {
	const entries = new Map<string, MemoryEntry>()

	return {
		get(key: string, now = Date.now()): unknown {
			const entry = entries.get(key)
			if (!entry) return undefined
			if (entry.expiresAt <= now) {
				entries.delete(key)
				return undefined
			}
			// Refresh recency so the least recently used entry is evicted first.
			entries.delete(key)
			entries.set(key, entry)
			return entry.data
		},
		set(key: string, data: unknown, ttlMs: number, now = Date.now()): void {
			entries.delete(key)
			entries.set(key, { data, expiresAt: now + ttlMs })
			while (entries.size > maxEntries) {
				const oldest = entries.keys().next().value
				if (oldest === undefined) break
				entries.delete(oldest)
			}
		},
		/** Deletes every entry whose key starts with `prefix` and returns how many were deleted. */
		deleteByPrefix(prefix: string): number {
			let deleted = 0
			for (const key of [...entries.keys()]) {
				if (key.startsWith(prefix)) {
					entries.delete(key)
					deleted += 1
				}
			}
			return deleted
		},
		clear(): void {
			entries.clear()
		},
		get size(): number {
			return entries.size
		}
	}
}

export const aniListMemoryCache = createAniListMemoryCache()

/** Shares one upstream promise between identical reads that overlap in time. */
export const aniListInFlightRequests = new Map<string, Promise<unknown>>()

let aniListWriteEpoch = 0

/** Bumped by every mutation; a read that started under an older epoch must not be cached. */
export function getAniListWriteEpoch(): number {
	return aniListWriteEpoch
}

/** Drops one viewer's cached reads and in-flight promises after that viewer changed their list. */
export function invalidateAniListViewer(viewer: string): void {
	aniListWriteEpoch += 1
	const prefix = `${viewer}:`
	aniListMemoryCache.deleteByPrefix(prefix)
	for (const key of [...aniListInFlightRequests.keys()]) {
		if (key.startsWith(prefix)) aniListInFlightRequests.delete(key)
	}
}

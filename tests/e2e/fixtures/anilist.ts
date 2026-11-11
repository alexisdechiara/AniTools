import { expect, type Page, type Route } from "@playwright/test"
import type {
	AniListActivitiesResponse,
	AniListAnimeActivity,
	AniListAnimeCollectionResponse,
	AniListAnimeListEntry,
	AniListListStatus,
	AniListMediaResponse,
	AniListMediaSummary,
	AniListProfileResponse,
	AniListRecommendationsResponse,
	AniListScoreFormat,
	AniListStatisticMetric,
	AniListStatistics,
	AniListStatisticsResponse,
	AniListStudioMediaResponse
} from "../../../shared/types/anilist"

// Every image points at a local file so a run never reaches AniList's CDN.
const LOCAL_IMAGE = "/og-default.svg"
const EPISODES = 12
const EPISODE_DURATION = 24
const GENRES = ["Action", "Mystery", "Slice of Life"] as const
const STUDIOS = [
	{ id: 9_001, name: "E2E Studio North" },
	{ id: 9_002, name: "E2E Studio South" }
] as const

function nowInSeconds(): number {
	return Math.floor(Date.now() / 1_000)
}

function currentYear(): number {
	return new Date().getUTCFullYear()
}

/** A complete AniList media with every field of `AniListMediaSummary` present. */
export function buildMedia(id: number, overrides: Partial<AniListMediaSummary> = {}): AniListMediaSummary {
	const title = `E2E anime ${id}`
	const studio = STUDIOS[id % STUDIOS.length]!

	return {
		id,
		idMal: null,
		type: "ANIME",
		title: { english: title, native: null, romaji: title, userPreferred: title },
		coverImage: { color: "#6366f1", extraLarge: LOCAL_IMAGE, large: LOCAL_IMAGE, medium: LOCAL_IMAGE },
		bannerImage: LOCAL_IMAGE,
		description: "A fixture anime used by the browser tests.",
		format: "TV",
		status: "FINISHED",
		episodes: EPISODES,
		duration: EPISODE_DURATION,
		genres: [GENRES[id % GENRES.length]!],
		countryOfOrigin: "JP",
		season: "SPRING",
		seasonYear: currentYear() - 1,
		startDate: { year: currentYear() - 1, month: 4, day: 1 },
		endDate: { year: currentYear() - 1, month: 6, day: 24 },
		averageScore: 75,
		meanScore: 76,
		popularity: 1_000,
		favourites: 10,
		isFavourite: false,
		isAdult: false,
		tags: [{
			id: 1,
			name: "Ensemble Cast",
			category: "Cast-Main Cast",
			rank: 80,
			isAdult: false,
			isGeneralSpoiler: false,
			isMediaSpoiler: false
		}],
		nextAiringEpisode: null,
		siteUrl: `https://anilist.co/anime/${id}`,
		studios: {
			edges: [{
				isMain: true,
				node: { id: studio.id, isAnimationStudio: true, name: studio.name, siteUrl: null }
			}]
		},
		rankings: [],
		externalLinks: [],
		trailer: null,
		relations: { edges: [] },
		...overrides
	}
}

/** A list entry; the status decides the score, the progress and the completion date. */
export function buildEntry(id: number, overrides: Partial<AniListAnimeListEntry> = {}): AniListAnimeListEntry {
	const status: AniListListStatus = overrides.status ?? "COMPLETED"
	const media = overrides.media === undefined ? buildMedia(id) : overrides.media
	const scored = status !== "PLANNING"

	return {
		id,
		status,
		score: scored ? Math.max(10, 95 - (id % 100) * 5) : 0,
		progress: status === "COMPLETED" ? EPISODES : status === "CURRENT" ? 5 : 0,
		repeat: 0,
		priority: 0,
		updatedAt: nowInSeconds() - (id % 100) * 3_600,
		startedAt: scored ? { year: currentYear(), month: 1, day: 1 } : null,
		completedAt: status === "COMPLETED"
			? { year: currentYear(), month: 1, day: Math.min(28, (id % 100) + 1) }
			: null,
		...overrides,
		media
	}
}

export function fixtureTitle(username: string, mediaId: number): string {
	return `${username} anime ${mediaId}`
}

const STATUS_CYCLE: readonly AniListListStatus[] = ["COMPLETED", "CURRENT", "PLANNING"]

/**
 * A collection that mixes COMPLETED, CURRENT and PLANNING entries across three genres and two
 * studios. Media ids start at `idBase + 1` so two profiles never share an id.
 */
export function buildCollection(username: string, count: number, idBase = 100): AniListAnimeCollectionResponse {
	const entries = Array.from({ length: count }, (_, index) => {
		const id = idBase + index + 1
		const status = STATUS_CYCLE[index % STATUS_CYCLE.length]!
		const title = fixtureTitle(username, id)
		const media = buildMedia(id, {
			title: { english: title, native: null, romaji: title, userPreferred: title },
			nextAiringEpisode: status === "CURRENT"
				? { airingAt: nowInSeconds() + (index + 1) * 86_400, episode: 6, timeUntilAiring: (index + 1) * 86_400 }
				: null
		})
		return buildEntry(id, { status, media })
	})

	return {
		source: { mode: "public", username },
		entries,
		truncated: false
	}
}

function metric(entries: readonly AniListAnimeListEntry[]): AniListStatisticMetric {
	const scored = entries.filter(entry => (entry.score ?? 0) > 0)
	return {
		count: entries.length,
		meanScore: scored.length
			? Math.round(scored.reduce((total, entry) => total + (entry.score ?? 0), 0) / scored.length * 10) / 10
			: 0,
		minutesWatched: entries.reduce(
			(total, entry) => total + (entry.progress ?? 0) * (entry.media?.duration ?? 0),
			0
		),
		mediaIds: entries.flatMap(entry => entry.media ? [entry.media.id] : [])
	}
}

function groupBy<Key>(
	entries: readonly AniListAnimeListEntry[],
	keysOf: (entry: AniListAnimeListEntry) => readonly Key[]
): Map<Key, AniListAnimeListEntry[]> {
	const groups = new Map<Key, AniListAnimeListEntry[]>()
	for (const entry of entries) {
		for (const key of keysOf(entry)) {
			groups.set(key, [...(groups.get(key) ?? []), entry])
		}
	}
	return groups
}

/** The smallest statistics payload whose totals agree with `buildCollection(username, count)`. */
export function buildStatistics(username: string, count = 8, idBase = 100): AniListStatisticsResponse {
	const { entries } = buildCollection(username, count, idBase)
	const totals = metric(entries)
	const statistics: AniListStatistics = {
		count: totals.count,
		meanScore: totals.meanScore,
		minutesWatched: totals.minutesWatched,
		episodesWatched: entries.reduce((total, entry) => total + (entry.progress ?? 0), 0),
		statuses: [...groupBy(entries, entry => [entry.status ?? "UNKNOWN"])]
			.map(([status, group]) => ({ ...metric(group), status })),
		scores: [...groupBy(entries.filter(entry => (entry.score ?? 0) > 0), entry => [entry.score ?? 0])]
			.map(([score, group]) => ({ ...metric(group), score })),
		formats: [{ ...totals, format: "TV" }],
		countries: [{ ...totals, country: "JP" }],
		genres: [...groupBy(entries, entry => entry.media?.genres ?? [])]
			.map(([genre, group]) => ({ ...metric(group), genre })),
		tags: [{
			...totals,
			tag: { id: 1, name: "Ensemble Cast", category: "Cast-Main Cast", isAdult: false }
		}],
		startYears: [{ ...totals, startYear: currentYear() }],
		releaseYears: [{ ...totals, releaseYear: currentYear() - 1 }],
		studios: [...groupBy(entries, entry => entry.media?.studios?.edges.map(edge => edge.node.id) ?? [])]
			.map(([studioId, group]) => ({
				...metric(group),
				studio: {
					id: studioId,
					name: STUDIOS.find(studio => studio.id === studioId)?.name ?? "Unknown studio",
					isAnimationStudio: true
				}
			})),
		voiceActors: [],
		staff: [],
		lengths: []
	}

	return { source: { mode: "public", username }, statistics }
}

/** A few anime activities, all dated in the current UTC year, for the first watched entries. */
export function buildActivities(
	username: string,
	profileId: number,
	collection: AniListAnimeCollectionResponse
): AniListActivitiesResponse {
	const now = nowInSeconds()
	const yearStart = Date.UTC(currentYear(), 0, 1) / 1_000
	const watched = collection.entries.filter(entry => entry.status !== "PLANNING").slice(0, 4)
	const activities: AniListAnimeActivity[] = watched.map((entry, index) => ({
		id: profileId * 1_000 + index + 1,
		kind: "anime",
		createdAt: Math.max(yearStart + (index + 1) * 60, now - (index + 1) * 3_600),
		replyCount: 0,
		type: "ANIME_LIST",
		user: { id: profileId, name: username, avatar: null },
		status: "watched episode",
		progress: `1 - ${entry.progress ?? 1}`,
		media: entry.media
			? {
					id: entry.media.id,
					title: entry.media.title,
					coverImage: { color: "#6366f1", large: LOCAL_IMAGE, medium: LOCAL_IMAGE },
					format: entry.media.format,
					siteUrl: entry.media.siteUrl
				}
			: null
	}))

	return {
		source: { mode: "public", username },
		pageInfo: { currentPage: 1, hasNextPage: false, lastPage: 1, perPage: 50, total: activities.length },
		activities
	}
}

export interface MockCallCounts {
	profile: number
	animeCollection: number
	statistics: number
	activities: number
	recommendations: number
	studioMedia: number
	media: number
}

export interface MockPublicProfileOptions {
	username: string
	scoreFormat?: AniListScoreFormat
	entryCount?: number
}

interface RegisteredProfile {
	username: string
	profileId: number
	scoreFormat: AniListScoreFormat
	collection: AniListAnimeCollectionResponse
	statistics: AniListStatisticsResponse
	activities: AniListActivitiesResponse
	calls: MockCallCounts
}

// One set of route handlers per page dispatches to every profile mocked on it, so two profiles can
// be mocked side by side: each answers for its own username only, and any other username gets a 404.
const registries = new WeakMap<Page, Map<string, RegisteredProfile>>()

function emptyPageInfo() {
	return { currentPage: 1, hasNextPage: false, lastPage: 1, perPage: 12, total: 0 }
}

async function notFound(route: Route): Promise<void> {
	await route.fulfill({
		status: 404,
		json: { statusCode: 404, statusMessage: "AniList user was not found" }
	})
}

function profileResponse(registered: RegisteredProfile): AniListProfileResponse {
	const now = nowInSeconds()
	return {
		source: { mode: "public", username: registered.username },
		profile: {
			id: registered.profileId,
			name: registered.username,
			about: null,
			avatar: null,
			bannerImage: null,
			createdAt: now - 86_400,
			siteUrl: `https://anilist.co/user/${registered.username}`,
			updatedAt: now,
			options: {
				displayAdultContent: false,
				profileColor: "blue",
				timezone: "Europe/Paris",
				titleLanguage: "ENGLISH"
			},
			mediaListOptions: {
				rowOrder: "score",
				scoreFormat: registered.scoreFormat
			}
		}
	}
}

async function installRoutes(page: Page, registry: Map<string, RegisteredProfile>): Promise<void> {
	async function byUsername(
		route: Route,
		count: keyof MockCallCounts,
		answer: (registered: RegisteredProfile, url: URL) => unknown
	): Promise<void> {
		const url = new URL(route.request().url())
		const registered = registry.get(url.searchParams.get("username") ?? "")
		if (!registered) return notFound(route)
		registered.calls[count] += 1
		await route.fulfill({ json: answer(registered, url) })
	}

	await page.route(url => url.pathname === "/api/anilist/profile", route =>
		byUsername(route, "profile", profileResponse))
	await page.route(url => url.pathname === "/api/anilist/anime-collection", route =>
		byUsername(route, "animeCollection", registered => registered.collection))
	await page.route(url => url.pathname === "/api/anilist/statistics", route =>
		byUsername(route, "statistics", registered => registered.statistics))
	await page.route(url => url.pathname === "/api/anilist/activities", route =>
		byUsername(route, "activities", registered => registered.activities))
	await page.route(url => url.pathname === "/api/anilist/recommendations", route =>
		byUsername(route, "recommendations", (registered, url): AniListRecommendationsResponse => ({
			source: { mode: "public", username: registered.username },
			seedMediaId: Number(url.searchParams.get("mediaId")) || 0,
			pageInfo: emptyPageInfo(),
			recommendations: []
		})))
	await page.route(url => url.pathname === "/api/anilist/studio-media", route =>
		byUsername(route, "studioMedia", (registered, url): AniListStudioMediaResponse => {
			const studioId = Number(url.searchParams.get("studioId")) || STUDIOS[0].id
			return {
				source: { mode: "public", username: registered.username },
				studio: {
					id: studioId,
					name: STUDIOS.find(studio => studio.id === studioId)?.name ?? "Unknown studio",
					isAnimationStudio: true,
					siteUrl: null
				},
				pageInfo: emptyPageInfo(),
				media: []
			}
		}))
	// The media endpoint takes no username: answer with the profile's own media when it owns the id.
	await page.route(url => url.pathname === "/api/anilist/media", async (route) => {
		const id = Number(new URL(route.request().url()).searchParams.get("id"))
		for (const registered of registry.values()) {
			const entry = registered.collection.entries.find(candidate => candidate.media?.id === id)
			if (entry?.media) {
				registered.calls.media += 1
				const body: AniListMediaResponse = { media: entry.media }
				return route.fulfill({ json: body })
			}
		}
		const body: AniListMediaResponse = { media: buildMedia(id) }
		await route.fulfill({ json: body })
	})
}

/**
 * Mocks every internal AniList endpoint a public profile reaches from the browser. Only requests
 * made by the browser are intercepted: enter through `openAs` and move between pages by clicking.
 */
export async function mockPublicProfile(page: Page, options: MockPublicProfileOptions): Promise<MockCallCounts> {
	let registry = registries.get(page)
	if (!registry) {
		registry = new Map()
		registries.set(page, registry)
		await installRoutes(page, registry)
	}

	const profileId = 41 + registry.size
	const entryCount = options.entryCount ?? 8
	const idBase = profileId * 100
	const collection = buildCollection(options.username, entryCount, idBase)
	const registered: RegisteredProfile = {
		username: options.username,
		profileId,
		scoreFormat: options.scoreFormat ?? "POINT_100",
		collection,
		statistics: buildStatistics(options.username, entryCount, idBase),
		activities: buildActivities(options.username, profileId, collection),
		calls: {
			profile: 0,
			animeCollection: 0,
			statistics: 0,
			activities: 0,
			recommendations: 0,
			studioMedia: 0,
			media: 0
		}
	}
	registry.set(options.username, registered)
	return registered.calls
}

/** Loads a public profile from the login page, then waits for the redirect to `redirect`. */
export async function openAs(page: Page, username: string, redirect: string): Promise<void> {
	await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
	await submitPublicProfile(page, username, redirect)
}

/** Fills the login form already on screen and waits for the redirect to `redirect`. */
export async function submitPublicProfile(page: Page, username: string, redirect: string): Promise<void> {
	// Before hydration the form would submit natively and drop the redirect: wait for Vue to mount.
	await page.waitForFunction(() => {
		const root = document.querySelector("#__nuxt") as (Element & { __vue_app__?: unknown }) | null
		return Boolean(root?.__vue_app__)
	})
	await page.getByLabel("AniList username").fill(username)
	await page.getByRole("button", { name: "View profile" }).click()
	await expect(page).toHaveURL(url => url.pathname === redirect)
}

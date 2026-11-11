import type * as z from "zod"
import type {
	AniListActivity,
	AniListMediaListSummary,
	AniListMediaSummary,
	AniListPageInfo,
	AniListSource,
	AniListStatistics
} from "~~/shared/types/anilist"
import {
	MAX_STATISTIC_GROUPS,
	MAX_MEDIA_IDS_PER_STATISTIC
} from "./constants"
import type {
	AniListAccess,
	mediaSchema,
	mediaListSchema,
	nullablePageInfoSchema,
	statisticStaffSchema,
	statisticsSchema,
	activitySchema
} from "./schemas"

export function sourceFromAccess(access: AniListAccess): AniListSource {
	return {
		mode: access.mode,
		username: access.username
	}
}

export function normalizePageInfo(
	pageInfo: z.infer<typeof nullablePageInfoSchema>,
	page: number,
	perPage: number
): AniListPageInfo {
	return {
		currentPage: pageInfo.currentPage ?? page,
		hasNextPage: pageInfo.hasNextPage ?? false,
		lastPage: pageInfo.lastPage,
		perPage: pageInfo.perPage ?? perPage,
		total: pageInfo.total ?? 0
	}
}

function withoutNulls<T>(items: ReadonlyArray<T | null> | null): T[] {
	return (items ?? []).filter((item): item is T => item !== null)
}

function normalizeStudios(
	studios: z.infer<typeof mediaSchema>["studios"]
): AniListMediaSummary["studios"] {
	return studios
		? {
				edges: (studios.edges ?? [])
					.flatMap(edge => edge?.node
						? [{ isMain: edge.isMain, node: edge.node }]
						: [])
			}
		: null
}

function normalizeRelations<Edge>(
	relations: { edges: ReadonlyArray<Edge | null> | null } | null
): { edges: Edge[] } | null {
	return relations ? { edges: withoutNulls(relations.edges) } : null
}

export function normalizeMedia(
	media: z.infer<typeof mediaSchema>
): AniListMediaSummary {
	return {
		...media,
		genres: withoutNulls(media.genres),
		tags: withoutNulls(media.tags),
		studios: normalizeStudios(media.studios),
		rankings: withoutNulls(media.rankings),
		externalLinks: withoutNulls(media.externalLinks),
		relations: normalizeRelations(media.relations)
	}
}

/**
 * List media: the details-view fields MEDIA_LIST_FIELDS does not select stay absent rather than
 * becoming `null` or `[]`, because `hasMediaDetails` reads `undefined` as "not fetched yet".
 */
export function normalizeListMedia(
	media: z.infer<typeof mediaListSchema>
): AniListMediaListSummary {
	const { rankings, externalLinks, ...rest } = media
	return {
		...rest,
		genres: withoutNulls(media.genres),
		tags: withoutNulls(media.tags),
		studios: normalizeStudios(media.studios),
		...(rankings === undefined ? {} : { rankings: withoutNulls(rankings) }),
		...(externalLinks === undefined ? {} : { externalLinks: withoutNulls(externalLinks) }),
		relations: normalizeRelations(media.relations)
	}
}

function boundedGroup<T extends { mediaIds: Array<number | null> }>(
	items: Array<T | null> | null
) {
	return (items ?? [])
		.filter((item): item is T => item !== null)
		.slice(0, MAX_STATISTIC_GROUPS)
		.map(item => ({
			...item,
			mediaIds: item.mediaIds
				.filter((mediaId): mediaId is number => mediaId !== null)
				.slice(0, MAX_MEDIA_IDS_PER_STATISTIC)
		}))
}

export function normalizeStatistics(
	statistics: z.infer<typeof statisticsSchema>
): AniListStatistics {
	const normalizePerson = (person: z.infer<typeof statisticStaffSchema>) => ({
		id: person.id,
		name: person.name,
		language: person.languageV2,
		image: person.image,
		primaryOccupations: (person.primaryOccupations ?? [])
			.filter((occupation): occupation is string => occupation !== null),
		siteUrl: person.siteUrl
	})
	const voiceActors = boundedGroup(statistics.voiceActors).map(item => ({
		...item,
		voiceActor: item.voiceActor ? normalizePerson(item.voiceActor) : null,
		characterIds: item.characterIds
			.filter((characterId): characterId is number => characterId !== null)
			.slice(0, MAX_MEDIA_IDS_PER_STATISTIC)
	}))
	const staff = boundedGroup(statistics.staff).map(item => ({
		...item,
		staff: item.staff ? normalizePerson(item.staff) : null
	}))

	return {
		...statistics,
		statuses: boundedGroup(statistics.statuses),
		scores: boundedGroup(statistics.scores),
		formats: boundedGroup(statistics.formats),
		countries: boundedGroup(statistics.countries),
		genres: boundedGroup(statistics.genres),
		tags: boundedGroup(statistics.tags),
		startYears: boundedGroup(statistics.startYears),
		releaseYears: boundedGroup(statistics.releaseYears),
		studios: boundedGroup(statistics.studios),
		voiceActors,
		staff,
		lengths: boundedGroup(statistics.lengths)
	}
}

export function normalizeActivity(
	activity: z.infer<typeof activitySchema>
): AniListActivity {
	switch (activity.__typename) {
		case "ListActivity":
			return {
				kind: "anime",
				id: activity.id,
				type: activity.type,
				status: activity.status,
				progress: activity.progress,
				createdAt: activity.createdAt,
				replyCount: activity.replyCount,
				user: activity.user,
				media: activity.media
			}
		case "TextActivity":
			return {
				kind: "text",
				id: activity.id,
				type: activity.type,
				text: activity.text ?? "",
				createdAt: activity.createdAt,
				replyCount: activity.replyCount,
				user: activity.user
			}
		case "MessageActivity":
			return {
				kind: "message",
				id: activity.id,
				type: activity.type,
				message: activity.message ?? "",
				createdAt: activity.createdAt,
				replyCount: activity.replyCount,
				user: activity.user,
				messenger: activity.messenger
			}
	}
}

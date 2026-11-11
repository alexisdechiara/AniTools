import type * as z from "zod"
import type {
	AniListMediaListSummary,
	AniListMediaSummary,
	AniListPageInfo,
	AniListSource
} from "~~/shared/types/anilist"
import type {
	AniListAccess,
	mediaSchema,
	mediaListSchema,
	nullablePageInfoSchema
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

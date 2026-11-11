import {
	MAX_MEDIA_BATCH_SIZE,
	MAX_AIRING_ID_PAGE_SIZE,
	MAX_SEARCH_RESULTS
} from "./constants"

const PROFILE_FIELDS = `
	id
	name
	about
	avatar { large medium }
	bannerImage
	createdAt
	siteUrl
	updatedAt
	options {
		titleLanguage
		displayAdultContent
		profileColor
		timezone
	}
	mediaListOptions {
		scoreFormat
		rowOrder
	}
`

const MEDIA_SUMMARY_FIELDS = `
	id
	idMal
	type
	title { romaji english native userPreferred }
	coverImage { extraLarge large medium color }
	bannerImage
	description
	format
	status
	episodes
	duration
	genres
	countryOfOrigin
	season
	seasonYear
	startDate { year month day }
	endDate { year month day }
	averageScore
	meanScore
	popularity
	favourites
	isFavourite
	isAdult
	tags {
		id
		name
		category
		rank
		isAdult
		isGeneralSpoiler
		isMediaSpoiler
	}
	nextAiringEpisode { airingAt episode timeUntilAiring }
	siteUrl
	studios(isMain: true) {
		edges {
			isMain
			node { id name isAnimationStudio siteUrl }
		}
	}
	rankings { allTime context rank season type year }
	externalLinks { color language site url }
	trailer { id site thumbnail }
	relations {
		edges {
			relationType
			node {
				id
				format
				title { romaji english native userPreferred }
			}
		}
	}
`

// What a list row needs: MEDIA_SUMMARY_FIELDS without the details-view fields (idMal, rankings,
// external links, trailer), the tag spoiler/adult flags and the relation titles and formats.
// The description stays: previews show it without a details request. Tier-list franchise
// grouping only reads relation types and ids. A field a card or a calculation needs goes in
// both sets; one only a details view needs goes in the full set, and the details popover
// fetches it on demand (see app/utils/media-details.ts).
const MEDIA_LIST_FIELDS = `
	id
	type
	title { romaji english native userPreferred }
	coverImage { extraLarge large medium color }
	bannerImage
	description
	format
	status
	episodes
	duration
	genres
	countryOfOrigin
	season
	seasonYear
	startDate { year month day }
	endDate { year month day }
	averageScore
	meanScore
	popularity
	favourites
	isFavourite
	isAdult
	tags { id name category rank }
	nextAiringEpisode { airingAt episode timeUntilAiring }
	siteUrl
	studios(isMain: true) {
		edges {
			isMain
			node { id name isAnimationStudio siteUrl }
		}
	}
	relations { edges { relationType node { id } } }
`

export const PROFILE_QUERY = `
	query AniToolsPublicProfile($username: String!) {
		User(name: $username) {
			${PROFILE_FIELDS}
		}
	}
`

export const VIEWER_PROFILE_QUERY = `
	query AniToolsViewerProfile {
		Viewer {
			${PROFILE_FIELDS}
		}
	}
`

export const ANIME_LIST_QUERY = `
	query AniToolsAnimeList(
		$userId: Int
		$username: String
		$status: MediaListStatus
		$sort: [MediaListSort]
		$page: Int!
		$perPage: Int!
	) {
		Page(page: $page, perPage: $perPage) {
			pageInfo {
				currentPage
				hasNextPage
				lastPage
				perPage
				total
			}
			mediaList(
				userId: $userId
				userName: $username
				type: ANIME
				status: $status
				sort: $sort
			) {
				id
				status
				score
				progress
				repeat
				priority
				updatedAt
				startedAt { year month day }
				completedAt { year month day }
				media {
					${MEDIA_LIST_FIELDS}
				}
			}
		}
	}
`

// One request returns up to FULL_LIST_PER_CHUNK entries, where Page caps at 50: loading a
// 433-entry list drops from nine upstream requests to one.
export const ANIME_COLLECTION_QUERY = `
	query AniToolsAnimeCollection(
		$userId: Int
		$username: String
		$chunk: Int!
		$perChunk: Int!
	) {
		MediaListCollection(
			userId: $userId
			userName: $username
			type: ANIME
			chunk: $chunk
			perChunk: $perChunk
			forceSingleCompletedList: true
		) {
			hasNextChunk
			lists {
				entries {
					id
					status
					score
					progress
					repeat
					priority
					updatedAt
					startedAt { year month day }
					completedAt { year month day }
					media {
						${MEDIA_LIST_FIELDS}
					}
				}
			}
		}
	}
`

export const ANIME_LIST_IDS_QUERY = `
	query AniToolsAnimeListIds(
		$userId: Int
		$username: String
		$chunk: Int!
		$perChunk: Int!
	) {
		MediaListCollection(
			userId: $userId
			userName: $username
			type: ANIME
			chunk: $chunk
			perChunk: $perChunk
		) {
			hasNextChunk
			lists {
				entries {
					mediaId
				}
			}
		}
	}
`

export const STATISTICS_QUERY = `
	query AniToolsAnimeStatistics($userId: Int, $username: String) {
		User(id: $userId, name: $username) {
			statistics {
				anime {
					count
					meanScore
					minutesWatched
					episodesWatched
					statuses { status count meanScore minutesWatched mediaIds }
					scores { score count meanScore minutesWatched mediaIds }
					formats { format count meanScore minutesWatched mediaIds }
					countries { country count meanScore minutesWatched mediaIds }
					genres { genre count meanScore minutesWatched mediaIds }
					tags {
						count
						meanScore
						minutesWatched
						mediaIds
						tag { id name category isAdult }
					}
					startYears { startYear count meanScore minutesWatched mediaIds }
					releaseYears { releaseYear count meanScore minutesWatched mediaIds }
					studios {
						count
						meanScore
						minutesWatched
						mediaIds
						studio { id name isAnimationStudio }
					}
					voiceActors(limit: 100, sort: COUNT_DESC) {
						count
						meanScore
						minutesWatched
						mediaIds
						characterIds
						voiceActor {
							id
							name { full native userPreferred }
							languageV2
							image { large medium }
							primaryOccupations
							siteUrl
						}
					}
					staff(limit: 100, sort: COUNT_DESC) {
						count
						meanScore
						minutesWatched
						mediaIds
						staff {
							id
							name { full native userPreferred }
							languageV2
							image { large medium }
							primaryOccupations
							siteUrl
						}
					}
					lengths { length count meanScore minutesWatched mediaIds }
				}
			}
		}
	}
`

export const ACTIVITIES_QUERY = `
	query AniToolsActivities(
		$userId: Int!
		$type: ActivityType
		$createdAtGreater: Int
		$createdAtLesser: Int
		$page: Int!
		$perPage: Int!
	) {
		Page(page: $page, perPage: $perPage) {
			pageInfo {
				currentPage
				hasNextPage
				lastPage
				perPage
				total
			}
			activities(
				userId: $userId
				type: $type
				createdAt_greater: $createdAtGreater
				createdAt_lesser: $createdAtLesser
				sort: ID_DESC
			) {
				__typename
				... on ListActivity {
					id
					type
					status
					progress
					createdAt
					replyCount
					user { id name avatar { large medium } }
					media {
						id
						title { romaji english native userPreferred }
						coverImage { large medium color }
						format
						siteUrl
					}
				}
				... on TextActivity {
					id
					type
					text
					createdAt
					replyCount
					user { id name avatar { large medium } }
				}
				... on MessageActivity {
					id
					type
					message
					createdAt
					replyCount
					user: recipient { id name avatar { large medium } }
					messenger { id name avatar { large medium } }
				}
			}
		}
	}
`

export const RECOMMENDATIONS_QUERY = `
	query AniToolsRecommendations(
		$mediaId: Int!
		$page: Int!
		$perPage: Int!
		$onList: Boolean
	) {
		Page(page: $page, perPage: $perPage) {
			pageInfo {
				currentPage
				hasNextPage
				lastPage
				perPage
				total
			}
			recommendations(mediaId: $mediaId, onList: $onList, sort: RATING_DESC) {
				id
				rating
				mediaRecommendation {
					${MEDIA_SUMMARY_FIELDS}
				}
			}
		}
	}
`

export const STUDIO_MEDIA_QUERY = `
	query AniToolsStudioMedia(
		$studioId: Int!
		$page: Int!
		$perPage: Int!
		$onList: Boolean
	) {
		Studio(id: $studioId) {
			id
			name
			isAnimationStudio
			siteUrl
			media(
				page: $page
				perPage: $perPage
				isMain: true
				onList: $onList
				sort: [SCORE_DESC, POPULARITY_DESC]
			) {
				pageInfo {
					currentPage
					hasNextPage
					lastPage
					perPage
					total
				}
				nodes {
					${MEDIA_SUMMARY_FIELDS}
				}
			}
		}
	}
`

export const SEARCH_QUERY = `
	query AniToolsSearch($search: String!) {
		Page(page: 1, perPage: ${MAX_SEARCH_RESULTS}) {
			media(type: ANIME, isAdult: false, search: $search) {
				id
				title { romaji english native userPreferred }
			}
		}
	}
`

export const MEDIA_QUERY = `
	query AniToolsMedia($mediaId: Int!) {
		Media(id: $mediaId, type: ANIME) {
			${MEDIA_SUMMARY_FIELDS}
		}
	}
`

export const AIRING_SCHEDULES_QUERY = `
	query AniToolsAiringSchedules(
		$page: Int!
		$perPage: Int!
		$airingAtGreater: Int!
		$airingAtLesser: Int!
	) {
		Page(page: $page, perPage: $perPage) {
			pageInfo { hasNextPage }
			airingSchedules(
				airingAt_greater: $airingAtGreater
				airingAt_lesser: $airingAtLesser
			) {
				airingAt
				episode
				timeUntilAiring
				media {
					${MEDIA_LIST_FIELDS}
				}
			}
		}
	}
`

export const MEDIA_BY_IDS_QUERY = `
	query AniToolsMediaByIds($mediaIds: [Int!]!, $perPage: Int!) {
		Page(page: 1, perPage: $perPage) {
			media(id_in: $mediaIds, type: ANIME, isAdult: false) {
				${MEDIA_SUMMARY_FIELDS}
			}
		}
	}
`

/**
 * Airing rows without their media: AniList accepts dozens of such pages in one request
 * (measured: 40 pages, 2,000 rows), where the full-media query costs one request per 50.
 * Only interpolates integers validated by getAniListAiringIds.
 */
export function buildAiringIdsQuery(pageCount: number, firstPage: number): string {
	const pages = Array.from({ length: pageCount }, (_, index) => `
		p${index}: Page(page: ${firstPage + index}, perPage: ${MAX_AIRING_ID_PAGE_SIZE}) {
			pageInfo { hasNextPage }
			airingSchedules(
				airingAt_greater: $airingAtGreater
				airingAt_lesser: $airingAtLesser
				sort: TIME
			) {
				airingAt
				episode
				timeUntilAiring
				mediaId
			}
		}
	`).join("")
	return `
		query AniToolsAiringIds($airingAtGreater: Int!, $airingAtLesser: Int!) {
			${pages}
		}
	`
}

/**
 * Up to MEDIA_BATCH_PAGES_PER_REQUEST aliased pages of MEDIA_BY_IDS_QUERY's selection, one per
 * non-empty chunk of ids. Only interpolates the chunk count validated by getAniListMediaByIdsBatch.
 */
export function buildMediaByIdsBatchQuery(chunkCount: number): string {
	const indexes = Array.from({ length: chunkCount }, (_, index) => index)
	const variables = indexes.map(index => `$ids${index}: [Int!]!`).join(", ")
	const pages = indexes.map(index => `
		m${index}: Page(page: 1, perPage: ${MAX_MEDIA_BATCH_SIZE}) {
			media(id_in: $ids${index}, type: ANIME, isAdult: false) {
				${MEDIA_SUMMARY_FIELDS}
			}
		}
	`).join("")
	return `
		query AniToolsMediaByIdsBatch(${variables}) {
			${pages}
		}
	`
}

export const MEDIA_LIST_ENTRY_QUERY = `
	query AniToolsMediaListEntry($userId: Int!, $mediaId: Int!) {
		MediaList(userId: $userId, mediaId: $mediaId, type: ANIME) {
			id
			status
		}
	}
`

export const SAVE_MEDIA_LIST_ENTRY_MUTATION = `
	mutation AniToolsSaveMediaListEntry($mediaId: Int!) {
		SaveMediaListEntry(mediaId: $mediaId, status: PLANNING) {
			id
			mediaId
			status
		}
	}
`

export const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co"
export const DEFAULT_TIMEOUT_MS = 10_000
export const MAX_PAGE = 100
export const MAX_LIST_PAGE_SIZE = 50
export const MAX_LIST_ID_CHUNKS = 20
export const FULL_LIST_PER_CHUNK = 500
export const MAX_FULL_LIST_CHUNKS = 10
export const LIST_IDS_PER_CHUNK = 500
export const MAX_ACTIVITY_PAGE_SIZE = 50
export const MAX_EXPLORE_PAGE_SIZE = 20
export const MAX_AIRING_PAGE_SIZE = 50
export const MAX_MEDIA_BATCH_SIZE = 50
export const AIRING_ID_PAGES_PER_REQUEST = 32
export const MAX_AIRING_ID_PAGE_SIZE = 50
export const MAX_AIRING_ID_FIRST_PAGE = 1_000
// 5 pages of the full media selection is the measured complexity ceiling (6 → 522 > 500); 4 leaves headroom.
export const MEDIA_BATCH_PAGES_PER_REQUEST = 4
export const MAX_MEDIA_RELATION_EDGES = 500
export const MAX_SEARCH_RESULTS = 10
export const MAX_SEARCH_LENGTH = 100
export const MAX_STATISTIC_GROUPS = 100
export const MAX_MEDIA_IDS_PER_STATISTIC = 250
export const MAX_UPSTREAM_STATISTIC_GROUPS = 5_000
export const UPSTREAM_REQUEST_LIMIT = 28
export const UPSTREAM_REQUEST_WINDOW_MS = 60_000
export const MIN_ACTIVITY_TIMESTAMP = 946_684_800
export const MAX_ACTIVITY_TIMESTAMP = 4_102_444_800
export const MAX_ACTIVITY_RANGE_SECONDS = 370 * 24 * 60 * 60
export const GRAPHQL_INT_MAX = 2_147_483_647

export const ANILIST_ALLOWED_OPERATIONS = [
	"profile",
	"anime-list",
	"anime-list-ids",
	"statistics",
	"activities",
	"recommendations",
	"studio-media",
	"search",
	"media",
	"airing-schedules",
	"airing-ids",
	"media-by-ids",
	"media-by-ids-batch",
	"media-list-entry",
	"save-media-list-entry"
] as const

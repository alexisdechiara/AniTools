import { assertSameOriginRequest } from "~~/server/utils/anilist-auth"
import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	forwardAniListRateLimit,
	parseAniListSaveMediaListEntryBody,
	resolveAniListAccess,
	saveAniListMediaListEntry,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

export default defineEventHandler(async (event) => {
	assertSameOriginRequest(event)
	enforceRateLimit(event, {
		namespace: "anilist-media-list-update",
		limit: 20,
		windowMs: 60_000
	})

	const body = parseAniListSaveMediaListEntryBody(await readBody(event))
	const access = await resolveAniListAccess(event)
	setAniListResponseCache(event, access.mode)

	try {
		return await saveAniListMediaListEntry(access, body)
	} catch (error) {
		forwardAniListRateLimit(event, error)
		throw error
	}
})

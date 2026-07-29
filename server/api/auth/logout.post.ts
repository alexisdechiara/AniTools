import {
	assertSameOriginRequest,
	clearAniListSession
} from "~~/server/utils/anilist-auth"

export default defineEventHandler((event) => {
	assertSameOriginRequest(event)
	clearAniListSession(event)
	setResponseHeader(event, "Cache-Control", "private, no-store")
	setResponseStatus(event, 204)
})

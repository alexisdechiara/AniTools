import { clearAniListSession } from "~~/server/utils/anilist-auth"

export default defineEventHandler((event) => {
	clearAniListSession(event)
	setResponseHeader(event, "Cache-Control", "private, no-store")
	setResponseStatus(event, 204)
})

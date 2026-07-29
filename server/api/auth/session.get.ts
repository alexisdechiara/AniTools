import { getAniListSession } from "~~/server/utils/anilist-auth"

export default defineEventHandler((event) => {
	setResponseHeader(event, "Cache-Control", "private, no-store")
	const session = getAniListSession(event)

	return {
		authenticated: Boolean(session),
		expiresAt: session?.expiresAt ?? null,
		user: session?.user ?? null
	}
})

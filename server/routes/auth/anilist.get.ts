import { createOAuthTransaction } from "~~/server/utils/anilist-auth"
import { enforceRateLimit } from "~~/server/utils/rate-limit"

export default defineEventHandler((event) => {
	enforceRateLimit(event, { namespace: "auth-start", limit: 20, windowMs: 60_000 })

	const query = getQuery(event)
	const { config, transaction } = createOAuthTransaction(event, query.returnTo)
	const authorizationUrl = new URL("https://anilist.co/api/v2/oauth/authorize")

	authorizationUrl.searchParams.set("client_id", config.clientId)
	authorizationUrl.searchParams.set("redirect_uri", config.redirectUri)
	authorizationUrl.searchParams.set("response_type", "code")
	authorizationUrl.searchParams.set("state", transaction.state)

	return sendRedirect(event, authorizationUrl.toString(), 302)
})

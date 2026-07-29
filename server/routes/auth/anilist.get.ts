import { createOAuthTransaction } from "~~/server/utils/anilist-auth"

export default defineEventHandler((event) => {
	const query = getQuery(event)
	const { config, transaction } = createOAuthTransaction(event, query.returnTo)
	const authorizationUrl = new URL("https://anilist.co/api/v2/oauth/authorize")

	authorizationUrl.searchParams.set("client_id", config.clientId)
	authorizationUrl.searchParams.set("redirect_uri", config.redirectUri)
	authorizationUrl.searchParams.set("response_type", "code")
	authorizationUrl.searchParams.set("state", transaction.state)

	return sendRedirect(event, authorizationUrl.toString(), 302)
})

import {
	consumeOAuthTransaction,
	exchangeAuthorizationCode,
	fetchAniListViewer,
	parseAuthorizationCode,
	setAniListSession
} from "~~/server/utils/anilist-auth"

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const transaction = consumeOAuthTransaction(event, query.state)
	const code = parseAuthorizationCode(query.code)

	if (!transaction || !code) {
		return sendRedirect(event, "/login?authError=invalid_callback", 302)
	}

	try {
		const token = await exchangeAuthorizationCode(transaction.config, code)
		const viewer = await fetchAniListViewer(token.access_token)
		setAniListSession(event, token, viewer)

		return sendRedirect(event, transaction.transaction.returnTo, 302)
	} catch {
		return sendRedirect(event, "/login?authError=exchange_failed", 302)
	}
})

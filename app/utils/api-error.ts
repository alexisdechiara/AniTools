interface ApiErrorShape {
	statusCode?: number
	status?: number
	statusMessage?: string
	data?: { statusMessage?: string, message?: string } | null
}

function asApiError(error: unknown): ApiErrorShape | null {
	return typeof error === "object" && error !== null ? error as ApiErrorShape : null
}

/**
 * Turns a failed internal API call into a sentence for the interface.
 *
 * ofetch puts the method and URL in `error.message` ("[GET] \"/api/anilist/…\": 429 …"), which
 * is noise to a reader and leaks the query string. This keeps the server's own status message
 * when there is one and replaces the cases a user can act on with an instruction.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
	const apiError = asApiError(error)
	const statusCode = apiError?.statusCode ?? apiError?.status

	if (statusCode === 429) {
		return "AniList is limiting requests right now. Wait a minute, then try again."
	}

	if (statusCode !== undefined && statusCode >= 500) {
		return "AniList didn't answer. Wait a few seconds, then try again."
	}

	const serverMessage = apiError?.data?.statusMessage ?? apiError?.statusMessage
	if (statusCode !== undefined && serverMessage) {
		return serverMessage.endsWith(".") ? serverMessage : `${serverMessage}.`
	}

	if (statusCode === undefined && error instanceof TypeError) {
		return "Unable to reach AniTools. Check your connection, then try again."
	}

	return fallback
}

// app/stores/User.ts
import { defineStore } from "pinia"
import {
	ANILIST_SCORE_FORMATS,
	ANILIST_TITLE_LANGUAGES,
	type AniListProfileResponse,
	type AniListScoreFormat,
	type AniListTitleLanguage
} from "~~/shared/types/anilist"

interface UserOptions {
	titleLanguage?: AniListTitleLanguage | null
	displayAdultContent?: boolean | null
	profileColor?: string | null
	timezone?: string | null
}

interface MediaListOptions {
	scoreFormat?: AniListScoreFormat | null
	rowOrder?: string | null
}

interface userAvatar {
	src?: string
	alt?: string
}

type AuthMode = "oauth" | "public" | null

const PUBLIC_PROFILE_COOKIE = "anitools-public-profile"

function isNotFoundError(error: unknown): boolean {
	return typeof error === "object" && error !== null
		&& "statusCode" in error && error.statusCode === 404
}

interface SessionUser {
	id: number
	name: string
	avatar?: {
		large?: string | null
		medium?: string | null
	} | null
	updatedAt?: number | null
	options?: {
		titleLanguage?: string | null
		displayAdultContent?: boolean | null
		profileColor?: string | null
		timezone?: string | null
	} | null
	mediaListOptions?: {
		scoreFormat?: string | null
		rowOrder?: string | null
	} | null
}

interface SessionResponse {
	authenticated: boolean
	expiresAt: number | null
	user: SessionUser | null
}

function isAniListTitleLanguage(value: unknown): value is AniListTitleLanguage {
	return typeof value === "string"
		&& ANILIST_TITLE_LANGUAGES.some(language => language === value)
}

function isAniListScoreFormat(value: unknown): value is AniListScoreFormat {
	return typeof value === "string"
		&& ANILIST_SCORE_FORMATS.some(format => format === value)
}

export const useUserStore = defineStore("User", () => {
	// Resolved once while the store is created: on the server, useRequestFetch() needs the
	// Nuxt context, which is gone after the first await inside an action.
	const requestFetch = import.meta.server ? useRequestFetch() : $fetch

	// State
	const id = ref<number>()
	const username = ref<string>("Not logged in")
	const avatar = ref<userAvatar>()
	const updatedAt = ref<number>()
	const authMode = ref<AuthMode>(null)
	const publicUsername = ref<string | null>(null)
	const sessionChecked = ref(false)
	const loading = ref(false)
	const error = ref<string | null>(null)
	const options = ref<UserOptions>({
		titleLanguage: "ENGLISH",
		displayAdultContent: false,
		profileColor: "#000000",
		// Null until a profile supplies one. Never the zone of the machine that created the
		// store: during server rendering that is the server's zone, not the visitor's.
		timezone: null
	})
	const mediaListOptions = ref<MediaListOptions>({
		scoreFormat: "POINT_100",
		rowOrder: "ANIME_BY_POPULARITY"
	})
	// localStorage is invisible to server rendering, so the public username also lives in a
	// cookie: a reload or a shared link can then restore the profile before the route guard runs.
	// It only ever holds a public AniList username, never a token.
	const publicProfileCookie = useCookie<string | null>(PUBLIC_PROFILE_COOKIE, {
		default: () => null,
		maxAge: 60 * 60 * 24 * 365,
		path: "/",
		sameSite: "lax"
	})

	// Getters
	const isAuthenticated = computed(() => !!id.value)
	const isOAuthAuthenticated = computed(() => authMode.value === "oauth" && !!id.value)

	function applyUser(user: SessionUser, mode: Exclude<AuthMode, null>) {
		id.value = user.id
		username.value = user.name
		avatar.value = {
			src: user.avatar?.large || user.avatar?.medium || undefined,
			alt: user.name
		}
		updatedAt.value = user.updatedAt || undefined
		authMode.value = mode
		publicUsername.value = mode === "public" ? user.name : null
		publicProfileCookie.value = publicUsername.value

		if (user.options) {
			const titleLanguage = user.options.titleLanguage
			options.value = {
				...options.value,
				titleLanguage: titleLanguage === null || isAniListTitleLanguage(titleLanguage)
					? titleLanguage
					: options.value.titleLanguage,
				displayAdultContent: user.options.displayAdultContent,
				profileColor: user.options.profileColor,
				timezone: user.options.timezone ?? null
			}
		}

		if (user.mediaListOptions) {
			const scoreFormat = user.mediaListOptions.scoreFormat
			mediaListOptions.value = {
				...mediaListOptions.value,
				scoreFormat: scoreFormat === null || isAniListScoreFormat(scoreFormat)
					? scoreFormat
					: mediaListOptions.value.scoreFormat,
				rowOrder: user.mediaListOptions.rowOrder
			}
		}
	}

	// Actions
	async function fetchUserData(userName: string) {
		const normalizedUsername = userName.trim()
		if (!normalizedUsername) {
			throw new Error("Enter an AniList username.")
		}

		loading.value = true
		error.value = null

		try {
			const fetcher = requestFetch
			const response = await fetcher<AniListProfileResponse>("/api/anilist/profile", {
				query: { username: normalizedUsername }
			})
			applyUser(response.profile, "public")
			sessionChecked.value = true

			// Retourner les références du store pour un traitement immédiat
			return {
				id: id.value,
				username: username.value,
				avatar: avatar.value,
				updatedAt: updatedAt.value,
				options: options.value,
				mediaListOptions: mediaListOptions.value
			}
		} catch (caughtError) {
			error.value = getApiErrorMessage(caughtError, "Unable to load this AniList profile.")
			throw caughtError
		} finally {
			loading.value = false
		}
	}

	function $reset() {
		id.value = undefined
		username.value = "Not logged in"
		avatar.value = undefined
		updatedAt.value = undefined
		authMode.value = null
		publicUsername.value = null
		publicProfileCookie.value = null
		sessionChecked.value = true
		loading.value = false
		error.value = null
		options.value = {
			titleLanguage: "ENGLISH",
			displayAdultContent: false,
			profileColor: "#000000",
			timezone: null
		}
		mediaListOptions.value = {
			scoreFormat: "POINT_100",
			rowOrder: "ANIME_BY_POPULARITY"
		}
	}

	async function restoreSession(force = false) {
		if (sessionChecked.value && !force) return isOAuthAuthenticated.value

		try {
			const fetcher = requestFetch
			const session = await fetcher<SessionResponse>("/api/auth/session")
			sessionChecked.value = true

			if (session.authenticated && session.user) {
				applyUser(session.user, "oauth")
				return true
			}

			if (authMode.value === "oauth") {
				$reset()
			} else if (publicUsername.value || publicProfileCookie.value) {
				const savedUsername = publicUsername.value ?? publicProfileCookie.value ?? ""
				try {
					await fetchUserData(savedUsername)
				} catch (caughtError) {
					// Only forget a profile AniList says is gone; a network hiccup should not.
					if (isNotFoundError(caughtError)) $reset()
				}
			}
			return false
		} catch {
			sessionChecked.value = true
			return false
		}
	}

	return {
		// State
		id,
		username,
		avatar,
		updatedAt,
		authMode,
		publicUsername,
		options,
		mediaListOptions,
		loading,
		error,

		// Getters
		isAuthenticated,
		isOAuthAuthenticated,
		getUsername: computed(() => username.value),

		// Actions
		fetchUserData,
		restoreSession,

		// Reset function
		$reset
	}
}, {
	persist: {
		storage: piniaPluginPersistedstate.localStorage(),
		pick: [
			"options",
			"mediaListOptions",
			"publicUsername"
		]
	}
})

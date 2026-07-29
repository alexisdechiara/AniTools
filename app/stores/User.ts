// app/stores/User.ts
import { ScoreFormat, UserTitleLanguage } from "#gql/default"
import { defineStore } from "pinia"

interface UserOptions {
	titleLanguage?: UserTitleLanguage | null
	displayAdultContent?: boolean | null
	profileColor?: string | null
	timezone?: string | null
}

interface MediaListOptions {
	scoreFormat?: ScoreFormat | null
	rowOrder?: string | null
}

interface userAvatar {
	src?: string
	alt?: string
}

type AuthMode = "oauth" | "public" | null

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

export const useUserStore = defineStore("User", () => {
	// State
	const id = ref<number>()
	const username = ref<string>("Not logged in")
	const avatar = ref<userAvatar>()
	const updatedAt = ref<number>()
	const authMode = ref<AuthMode>(null)
	const sessionChecked = ref(false)
	const options = ref<UserOptions>({
		titleLanguage: UserTitleLanguage.ENGLISH,
		displayAdultContent: false,
		profileColor: "#000000",
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
	})
	const mediaListOptions = ref<MediaListOptions>({
		scoreFormat: ScoreFormat.POINT_100,
		rowOrder: "ANIME_BY_POPULARITY"
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

		if (user.options) {
			options.value = {
				...options.value,
				titleLanguage: user.options.titleLanguage as UserTitleLanguage | null | undefined,
				displayAdultContent: user.options.displayAdultContent,
				profileColor: user.options.profileColor,
				timezone: user.options.timezone
			}
		}

		if (user.mediaListOptions) {
			mediaListOptions.value = {
				...mediaListOptions.value,
				scoreFormat: user.mediaListOptions.scoreFormat as ScoreFormat | null | undefined,
				rowOrder: user.mediaListOptions.rowOrder
			}
		}
	}

	// Actions
	async function fetchUserData(userName: string) {
		try {
			const { data } = await useAsyncGql({
				operation: "auth",
				variables: { username: userName }
			})

			if (!data?.value?.User) {
				throw new Error("User not found")
			}

			const user = data.value.User

			applyUser({
				...user,
				name: userName
			}, "public")

			// Retourner les références du store pour un traitement immédiat
			return {
				id: id.value,
				username: username.value,
				avatar: avatar.value,
				updatedAt: updatedAt.value,
				options: options.value,
				mediaListOptions: mediaListOptions.value
			}
		} catch (error) {
			console.error("Error fetching user data:", error)
			throw error
		}
	}

	function $reset() {
		id.value = undefined
		username.value = "Not logged in"
		avatar.value = undefined
		updatedAt.value = undefined
		authMode.value = null
		sessionChecked.value = true
		options.value = {
			titleLanguage: UserTitleLanguage.ENGLISH,
			displayAdultContent: false,
			profileColor: "#000000",
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		}
		mediaListOptions.value = {
			scoreFormat: ScoreFormat.POINT_100,
			rowOrder: "ANIME_BY_POPULARITY"
		}
	}

	async function restoreSession(force = false) {
		if (sessionChecked.value && !force) return isOAuthAuthenticated.value

		try {
			const fetcher = import.meta.server ? useRequestFetch() : $fetch
			const session = await fetcher<SessionResponse>("/api/auth/session")
			sessionChecked.value = true

			if (session.authenticated && session.user) {
				applyUser(session.user, "oauth")
				return true
			}

			if (authMode.value === "oauth") {
				$reset()
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
		options,
		mediaListOptions,

		// Getters
		isAuthenticated,
		isOAuthAuthenticated,
		getId: computed(() => id.value),
		getUsername: computed(() => username.value),
		getAvatar: computed(() => avatar.value),
		getUpdatedAt: computed(() => updatedAt.value),
		getOptions: computed(() => options.value),
		getMediaListOptions: computed(() => mediaListOptions.value),

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
			"mediaListOptions"
		]
	}
})

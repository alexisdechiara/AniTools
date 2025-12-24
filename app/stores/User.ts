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

export const useUserStore = defineStore("User", () => {
	// State
	const id = ref<number>()
	const username = ref<string>("Not logged in")
	const avatar = ref<userAvatar>()
	const updatedAt = ref<number>()
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

			// Mettre à jour le store
			id.value = user.id
			username.value = userName
			avatar.value = {
				src: user.avatar?.large || user.avatar?.medium || undefined,
				alt: userName
			}
			updatedAt.value = user.updatedAt || undefined

			if (user.options) {
				options.value = {
					...options.value,
					...user.options
				}
			}

			if (user.mediaListOptions) {
				mediaListOptions.value = {
					...mediaListOptions.value,
					...user.mediaListOptions
				}
			}

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

	return {
		// State
		id,
		username,
		avatar,
		updatedAt,
		options,
		mediaListOptions,

		// Getters
		isAuthenticated,
		getId: computed(() => id.value),
		getUsername: computed(() => username.value),
		getAvatar: computed(() => avatar.value),
		getUpdatedAt: computed(() => updatedAt.value),
		getOptions: computed(() => options.value),
		getMediaListOptions: computed(() => mediaListOptions.value),

		// Actions
		fetchUserData,

		// Reset function
		$reset() {
			id.value = undefined
			username.value = "Not logged in"
			avatar.value = undefined
			updatedAt.value = undefined
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
	}
}, {
	persist: true
})

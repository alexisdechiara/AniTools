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

export const useUserStore = defineStore("user", () => {
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
	async function fetchUserData(userName: string): Promise<boolean> {
		try {
			const { data } = await useAsyncGql({
				operation: "auth",
				variables: { username: userName }
			})

			if (data?.value?.User) {
				const user = data.value.User
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

				return true
			}

			return false
		} catch (error) {
			console.error("Error fetching user data:", error)
			return false
		}
	}

	return {
		// State
		id: readonly(id),
		username: readonly(username),
		avatar: readonly(avatar),
		updatedAt: readonly(updatedAt),
		options: options,
		mediaListOptions: mediaListOptions,

		// Getters
		isAuthenticated,

		// Actions
		fetchUserData
	}
}, {
	persist: true
})

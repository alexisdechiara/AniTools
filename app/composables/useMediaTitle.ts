import { getMediaTitle, type MediaDisplayLike } from "~/utils/media-display"

/**
 * Picks the title to display for an anime.
 *
 * The AniList `titleLanguage` setting only drives the order for an OAuth session: it is the
 * signed-in user's own profile. On a public profile the visitor is usually not that profile's
 * owner, so the neutral order (`userPreferred`, then English, Romaji, Native) applies instead.
 */
export function useMediaTitle() {
	const userStore = useUserStore()

	function title(media: Pick<MediaDisplayLike, "id" | "title"> | null | undefined): string {
		const language = userStore.isOAuthAuthenticated ? userStore.options.titleLanguage : null
		return getMediaTitle(media, language)
	}

	return { title }
}

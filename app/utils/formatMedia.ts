export function formatMediaToEntry(media: any) {
	const entry = media.mediaListEntry

	return {
		status: entry?.status,
		score: entry?.score,
		repeat: entry?.repeat,
		progress: entry?.progress,
		updatedAt: entry?.updatedAt,
		startedAt: entry?.startedAt,
		completedAt: entry?.completedAt,
		media: media.Media
	}
}

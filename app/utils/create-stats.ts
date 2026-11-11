import { formatWatchTime } from "~/utils/formatTime"

export interface CreateStatTile {
	label: string
	value: string
}

export interface CreateStatsSnapshotInput {
	count: number
	meanScore: number
	minutesWatched: number
	episodesWatched: number
}

export function buildCreateStatTiles(input: CreateStatsSnapshotInput): CreateStatTile[] {
	return [
		{ label: "Anime watched", value: String(Math.max(0, Math.round(input.count))) },
		{ label: "Episodes watched", value: String(Math.max(0, Math.round(input.episodesWatched))) },
		{ label: "Watch time", value: formatWatchTime(input.minutesWatched) },
		{ label: "Mean score", value: `${Math.round(input.meanScore)}%` }
	]
}

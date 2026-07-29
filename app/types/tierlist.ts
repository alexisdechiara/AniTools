export interface TierlistDate {
	year?: number | null
	month?: number | null
	day?: number | null
}

export interface TierlistTitle {
	romaji?: string | null
	english?: string | null
	native?: string | null
	userPreferred?: string | null
}

export interface TierlistCoverImage {
	medium?: string | null
	large?: string | null
	extraLarge?: string | null
	color?: string | null
}

export interface TierlistRelationNode {
	id: number
	format?: string | null
	title?: TierlistTitle | null
}

export interface TierlistRelationEdge {
	relationType?: string | null
	node?: TierlistRelationNode | null
}

export interface TierlistMedia {
	id: number
	title?: TierlistTitle | null
	coverImage?: TierlistCoverImage | null
	relations?: {
		edges?: TierlistRelationEdge[] | null
	} | null
	siteUrl?: string | null
	description?: string | null
	format?: string | null
	status?: string | null
	season?: string | null
	seasonYear?: number | null
	startDate?: TierlistDate | null
	endDate?: TierlistDate | null
	episodes?: number | null
	duration?: number | null
	bannerImage?: string | null
	averageScore?: number | null
	meanScore?: number | null
	favourites?: number | null
	genres?: string[] | null
	rankings?: Array<{
		allTime?: boolean | null
		context?: string | null
		season?: string | null
		type?: string | null
		year?: number | null
		rank?: number | null
	}> | null
	studios?: {
		edges?: Array<{
			isMain?: boolean | null
			node?: {
				name: string
				siteUrl?: string | null
			} | null
		}> | null
	} | null
	externalLinks?: Array<{
		site: string
		url?: string | null
		language?: string | null
		color?: string | null
	}> | null
	trailer?: {
		id?: string | null
		site?: string | null
		thumbnail?: string | null
	} | null
}

export interface TierlistEntry {
	status?: string | null
	score?: number | null
	repeat?: number | null
	progress?: number | null
	updatedAt?: number | null
	startedAt?: TierlistDate | null
	completedAt?: TierlistDate | null
	locked?: boolean
	media: TierlistMedia
}

export interface TierlistTier {
	id: string
	name: string
	color: string
	range: [number, number]
	entries: TierlistEntry[]
}

export interface TierlistSettings {
	currentTemplate: number
	gapSize: number
	headingCorner: boolean
	rowCorner: number
	colWidth: number
	selectedBackground: string
	nbCol: number
}

export interface TierlistSnapshot {
	tiers: TierlistTier[]
	unranked: TierlistEntry[]
	settings: TierlistSettings
}

export interface TierlistExportDocument extends TierlistSnapshot {
	kind: "anitools-tierlist"
	version: 1
	exportedAt: string
}

export interface TierlistFilters {
	title: string
	genres: string[]
	years: number[]
	seasons: string[]
	formats: string[]
	score: [number, number]
}

export interface TierlistImportFilters {
	score: [number, number]
	statuses: string[]
	genres: string[]
	years: number[]
	seasons: string[]
	formats: string[]
}

export interface TierlistImportResult {
	added: number
	skipped: number
	truncated: boolean
}

export interface TierlistMoveTarget {
	id: string
	label: string
}

export type TierlistLaneId = "unranked" | string

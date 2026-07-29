import type {
	TierlistEntry,
	TierlistImportFilters,
	TierlistTier
} from "~/types/tierlist"

const FRANCHISE_RELATIONS = new Set(["PREQUEL", "SEQUEL"])

function normalize(value: string | null | undefined): string {
	return value?.trim().toUpperCase() ?? ""
}

export function matchesTierlistImportFilters(
	entry: TierlistEntry,
	filters: TierlistImportFilters
): boolean {
	const score = entry.score ?? 0
	const [minimumScore, maximumScore] = filters.score
	if (score < minimumScore || score > maximumScore) return false

	if (
		filters.statuses.length > 0
		&& !filters.statuses.map(normalize).includes(normalize(entry.status))
	) return false

	if (
		filters.genres.length > 0
		&& !entry.media.genres?.some(genre =>
			filters.genres.map(normalize).includes(normalize(genre))
		)
	) return false

	if (
		filters.years.length > 0
		&& (!entry.media.startDate?.year || !filters.years.includes(entry.media.startDate.year))
	) return false

	if (
		filters.seasons.length > 0
		&& !filters.seasons.map(normalize).includes(normalize(entry.media.season))
	) return false

	if (
		filters.formats.length > 0
		&& !filters.formats.map(normalize).includes(normalize(entry.media.format))
	) return false

	return true
}

export function findMatchingTierIds(entry: TierlistEntry, tiers: TierlistTier[]): string[] {
	const score = entry.score ?? 0
	return tiers
		.filter((tier) => {
			const minimum = tier.range[0] ?? 0
			const maximum = tier.range[1] ?? 100
			return score >= minimum && score <= maximum
		})
		.map(tier => tier.id)
}

export function findOverlappingTierRanges(tiers: TierlistTier[]): string[] {
	const overlaps: string[] = []

	for (let firstIndex = 0; firstIndex < tiers.length; firstIndex += 1) {
		for (let secondIndex = firstIndex + 1; secondIndex < tiers.length; secondIndex += 1) {
			const firstTier = tiers[firstIndex]
			const secondTier = tiers[secondIndex]
			if (!firstTier || !secondTier) continue

			const firstMinimum = firstTier.range[0] ?? 0
			const firstMaximum = firstTier.range[1] ?? 100
			const secondMinimum = secondTier.range[0] ?? 0
			const secondMaximum = secondTier.range[1] ?? 100

			if (!(firstMaximum < secondMinimum || secondMaximum < firstMinimum)) {
				overlaps.push(
					`${firstTier.name} (${firstMinimum}-${firstMaximum}) overlaps with `
					+ `${secondTier.name} (${secondMinimum}-${secondMaximum})`
				)
			}
		}
	}

	return overlaps
}

class DisjointSet {
	private readonly parents = new Map<number, number>()

	add(id: number): void {
		if (!this.parents.has(id)) this.parents.set(id, id)
	}

	find(id: number): number {
		const parent = this.parents.get(id) ?? id
		if (parent === id) return id
		const root = this.find(parent)
		this.parents.set(id, root)
		return root
	}

	union(first: number, second: number): void {
		const firstRoot = this.find(first)
		const secondRoot = this.find(second)
		if (firstRoot !== secondRoot) this.parents.set(secondRoot, firstRoot)
	}
}

function mediaDateValue(entry: TierlistEntry): number {
	const year = entry.media.startDate?.year ?? entry.media.seasonYear ?? 9999
	const month = entry.media.startDate?.month ?? 12
	const day = entry.media.startDate?.day ?? 31
	return year * 10_000 + month * 100 + day
}

/**
 * Selects one entry per prequel/sequel connected component. Relations pointing
 * outside the loaded AniList collection are intentionally ignored.
 */
export function selectFranchiseRepresentatives(
	allEntries: TierlistEntry[],
	candidates: TierlistEntry[]
): TierlistEntry[] {
	const availableIds = new Set(allEntries.map(entry => entry.media.id))
	const sets = new DisjointSet()
	for (const mediaId of availableIds) sets.add(mediaId)

	for (const entry of allEntries) {
		for (const edge of entry.media.relations?.edges ?? []) {
			const relatedId = edge.node?.id
			if (
				typeof relatedId === "number"
				&& availableIds.has(relatedId)
				&& FRANCHISE_RELATIONS.has(normalize(edge.relationType))
			) {
				sets.union(entry.media.id, relatedId)
			}
		}
	}

	const representatives = new Map<number, TierlistEntry>()
	for (const candidate of candidates) {
		const componentId = sets.find(candidate.media.id)
		const current = representatives.get(componentId)
		if (
			!current
			|| mediaDateValue(candidate) < mediaDateValue(current)
			|| (
				mediaDateValue(candidate) === mediaDateValue(current)
				&& candidate.media.id < current.media.id
			)
		) {
			representatives.set(componentId, candidate)
		}
	}

	return [...representatives.values()]
}

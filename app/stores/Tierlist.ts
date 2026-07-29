import type { CommandPaletteItem } from "@nuxt/ui"
import { defineStore } from "pinia"
import type { AniListMediaResponse } from "~~/shared/types/anilist"
import type {
	TierlistEntry,
	TierlistImportResult,
	TierlistLaneId,
	TierlistMoveTarget,
	TierlistSnapshot,
	TierlistTier
} from "~/types/tierlist"
import {
	MAX_TIERLIST_ENTRIES,
	MAX_TIERLIST_ENTRIES_PER_LANE,
	MAX_TIERLIST_TIERS,
	createCustomTierId,
	createTemplateTierId,
	createTierlistSnapshot,
	deserializeTierlistState,
	formatMediaResultToTierlistEntry,
	sanitizeTierlistEntry,
	serializeTierlistState
} from "~/utils/tierlist-model"
import {
	findMatchingTierIds,
	findOverlappingTierRanges,
	matchesTierlistImportFilters,
	selectFranchiseRepresentatives
} from "~/utils/tierlist-ranking"
import {
	bodyColWidthToClass,
	colWidthToClass,
	gapSizeToClass,
	gapSizeToText,
	getTierlistNeutralBackgrounds,
	nbColToClass,
	rowCornerToClass
} from "~/utils/tierlist"
import {
	defaultTierlistTemplateIndex,
	tierlistTemplates
} from "~/utils/tierlist-templates"

function createTemplateTiers(templateIndex: number): TierlistTier[] {
	const template = tierlistTemplates[templateIndex]
	if (!template) return []

	return template.value.map((tier, tierIndex) => ({
		id: createTemplateTierId(templateIndex, tierIndex, tier.name),
		name: tier.name,
		color: tier.color,
		range: [...tier.range],
		entries: []
	}))
}

function uniqueEntries(entries: TierlistEntry[]): TierlistEntry[] {
	const mediaIds = new Set<number>()
	return entries.filter((entry) => {
		if (mediaIds.has(entry.media.id)) return false
		mediaIds.add(entry.media.id)
		return true
	})
}

export const useTierlistStore = defineStore("tierlist", () => {
	const templates = ref(tierlistTemplates)
	const currentTemplate = ref(defaultTierlistTemplateIndex)
	const tiers = ref<TierlistTier[]>(createTemplateTiers(currentTemplate.value))
	const unrankedTier = ref<TierlistEntry[]>([])

	const gapSize = ref(25)
	const headingCorner = ref(true)
	const rowCorner = ref(6)
	const colWidth = ref(0)
	const nbCol = ref(10)

	const filterTitle = ref("")
	const filterGenres = ref<string[]>([])
	const filterYears = ref<number[]>([])
	const filterSeasons = ref<string[]>([])
	const filterFormats = ref<string[]>([])
	const filterScore = ref<[number, number]>([0, 100])

	const colorMode = useColorMode()
	const selectedBackground = ref(
		colorMode.value === "dark" ? "bg-neutral-900" : "bg-neutral-100"
	)

	const neutralBackgrounds = computed(() =>
		getTierlistNeutralBackgrounds(colorMode.value === "dark" ? "dark" : "light")
	)
	const gapSizeText = computed(() => gapSizeToText(gapSize.value))
	const gapSizeClass = computed(() => gapSizeToClass(gapSize.value))
	const rowCornerClass = computed(() => rowCornerToClass(rowCorner.value))
	const colWidthClass = computed(() => colWidthToClass(colWidth.value))
	const bodyColWidthClass = computed(() => bodyColWidthToClass(colWidth.value))
	const nbColClass = computed(() => nbColToClass(nbCol.value))
	const entryCount = computed(() =>
		unrankedTier.value.length
		+ tiers.value.reduce((total, tier) => total + tier.entries.length, 0)
	)

	function setBackground(color: string): void {
		selectedBackground.value = color
	}

	function setGapSize(size: number): void {
		gapSize.value = size
	}

	function setHeadingCorner(enabled: boolean): void {
		headingCorner.value = enabled
	}

	function setRowCorner(corner: number): void {
		rowCorner.value = corner
	}

	function setColWidth(width: number): void {
		colWidth.value = width
	}

	function setFilterScore(range: [number, number]): void {
		filterScore.value = range
	}

	function setDefaultBackgroundForTheme(): void {
		selectedBackground.value = colorMode.value === "dark"
			? "bg-neutral-900"
			: "bg-neutral-100"
	}

	function laneEntries(laneId: TierlistLaneId): TierlistEntry[] | null {
		if (laneId === "unranked") return unrankedTier.value
		return tiers.value.find(tier => tier.id === laneId)?.entries ?? null
	}

	function hasEntry(mediaId: number, laneId?: TierlistLaneId): boolean {
		if (laneId) {
			return laneEntries(laneId)?.some(entry => entry.media.id === mediaId) ?? false
		}
		return unrankedTier.value.some(entry => entry.media.id === mediaId)
			|| tiers.value.some(tier => tier.entries.some(entry => entry.media.id === mediaId))
	}

	function addEntryToUnrankedTier(input: unknown, allowDuplicate = false): boolean {
		const entry = sanitizeTierlistEntry(input)
		if (!entry) return false
		if (unrankedTier.value.length >= MAX_TIERLIST_ENTRIES_PER_LANE) return false
		if (entryCount.value >= MAX_TIERLIST_ENTRIES) return false
		if (!allowDuplicate && hasEntry(entry.media.id)) return false
		if (hasEntry(entry.media.id, "unranked")) return false

		unrankedTier.value.push(entry)
		return true
	}

	function addEntryToLane(input: unknown, laneId: TierlistLaneId): boolean {
		if (laneId === "unranked") return addEntryToUnrankedTier(input)
		const entry = sanitizeTierlistEntry(input)
		const tier = tiers.value.find(candidate => candidate.id === laneId)
		if (!entry || !tier) return false
		return addEntryToTier(tier, entry, false)
	}

	function addEntryToTier(
		tier: TierlistTier,
		entry: TierlistEntry,
		allowDuplicateAcrossLanes: boolean
	): boolean {
		if (tier.entries.length >= MAX_TIERLIST_ENTRIES_PER_LANE) return false
		if (entryCount.value >= MAX_TIERLIST_ENTRIES) return false
		if (tier.entries.some(existing => existing.media.id === entry.media.id)) return false
		if (!allowDuplicateAcrossLanes && hasEntry(entry.media.id)) return false
		tier.entries.push(entry)
		return true
	}

	function changeTemplate(index: number): void {
		if (!templates.value[index]) return
		const allEntries = uniqueEntries([
			...unrankedTier.value,
			...tiers.value.flatMap(tier => tier.entries)
		])
		currentTemplate.value = index
		tiers.value = createTemplateTiers(index)
		unrankedTier.value = allEntries.slice(0, MAX_TIERLIST_ENTRIES_PER_LANE)
	}

	function addTier(): void {
		if (tiers.value.length >= MAX_TIERLIST_TIERS) return
		tiers.value.push({
			id: createCustomTierId(),
			name: "New tier",
			color: "#737373",
			range: [0, 0],
			entries: []
		})
		currentTemplate.value = -1
	}

	function removeTier(index: number): void {
		const tier = tiers.value[index]
		if (!tier) return

		const mergedEntries = uniqueEntries([...unrankedTier.value, ...tier.entries])
			.slice(0, MAX_TIERLIST_ENTRIES_PER_LANE)
		unrankedTier.value = mergedEntries
		tiers.value.splice(index, 1)
		currentTemplate.value = -1
	}

	function moveTierUp(index: number): void {
		const tier = tiers.value[index]
		if (!tier || index <= 0) return
		tiers.value.splice(index, 1)
		tiers.value.splice(index - 1, 0, tier)
		currentTemplate.value = -1
	}

	function moveTierDown(index: number): void {
		const tier = tiers.value[index]
		if (!tier || index >= tiers.value.length - 1) return
		tiers.value.splice(index, 1)
		tiers.value.splice(index + 1, 0, tier)
		currentTemplate.value = -1
	}

	async function addAnime(item: CommandPaletteItem): Promise<boolean> {
		const mediaId = typeof item.id === "number" ? item.id : Number(item.id)
		if (!Number.isInteger(mediaId) || mediaId <= 0) return false

		const { getAllAnimes } = storeToRefs(useEntriesStore())
		const existingEntry = getAllAnimes.value.find(entry => entry?.media?.id === mediaId)
		if (existingEntry) return addEntryToUnrankedTier(existingEntry)

		const response = await $fetch<AniListMediaResponse>("/api/anilist/media", {
			query: { id: mediaId }
		})
		const entry = formatMediaResultToTierlistEntry(response.media)
		return entry ? addEntryToUnrankedTier(entry) : false
	}

	function getExistingMediaIds(): Set<number> {
		return new Set([
			...unrankedTier.value,
			...tiers.value.flatMap(tier => tier.entries)
		].map(entry => entry.media.id))
	}

	function importAnimesFromEntries(
		autoRank: boolean,
		scoreRange: [number, number],
		statuses: string[] = [],
		genres: string[] = [],
		years: number[] = [],
		seasons: string[] = [],
		formats: string[] = [],
		isFranchise = false,
		allowDuplicates = false
	): TierlistImportResult {
		const entriesStore = useEntriesStore()
		const { getAllAnimes, isInitialized } = storeToRefs(entriesStore)
		if (!isInitialized.value) {
			return { added: 0, skipped: 0, truncated: false }
		}

		const allEntries = getAllAnimes.value
			.map(sanitizeTierlistEntry)
			.filter((entry): entry is TierlistEntry => entry !== null)
		const existingIds = getExistingMediaIds()
		const effectiveYears = isFranchise ? [] : years
		const effectiveSeasons = isFranchise ? [] : seasons
		const effectiveFormats = isFranchise ? [] : formats
		const candidates = allEntries.filter(entry =>
			!existingIds.has(entry.media.id)
			&& matchesTierlistImportFilters(entry, {
				score: scoreRange,
				statuses,
				genres,
				years: effectiveYears,
				seasons: effectiveSeasons,
				formats: effectiveFormats
			})
		)
		const selectedEntries = isFranchise
			? selectFranchiseRepresentatives(allEntries, candidates)
			: candidates
		const remainingCapacity = Math.max(0, MAX_TIERLIST_ENTRIES - entryCount.value)
		const entriesToImport = selectedEntries.slice(0, remainingCapacity)

		const added = autoRank
			? rankEntries(entriesToImport, allowDuplicates)
			: entriesToImport.reduce(
				(total, entry) => total + (addEntryToUnrankedTier(entry) ? 1 : 0),
				0
			)

		return {
			added,
			skipped: Math.max(0, candidates.length - added),
			truncated: selectedEntries.length > entriesToImport.length || added < entriesToImport.length
		}
	}

	function rankEntries(inputs: unknown[], allowDuplicates = false): number {
		const entries = inputs
			.map(sanitizeTierlistEntry)
			.filter((entry): entry is TierlistEntry => entry !== null)
		if (entries.length === 0) return 0

		const overlappingRanges = checkOverlappingRanges()
		if (overlappingRanges.length > 0 && !allowDuplicates) {
			throw new Error("OVERLAPPING_RANGES")
		}

		let rankedCount = 0
		for (const entry of entries) {
			const matchingIds = findMatchingTierIds(entry, tiers.value)
			const matchingTiers = matchingIds
				.map(id => tiers.value.find(tier => tier.id === id))
				.filter((tier): tier is TierlistTier => tier !== undefined)

			if (matchingTiers.length === 1) {
				if (addEntryToTier(matchingTiers[0]!, entry, false)) rankedCount += 1
			} else if (matchingTiers.length > 1 && allowDuplicates) {
				if (entryCount.value + matchingTiers.length > MAX_TIERLIST_ENTRIES) {
					continue
				}
				let added = false
				for (const tier of matchingTiers) {
					added = addEntryToTier(tier, entry, true) || added
				}
				if (added) rankedCount += 1
			} else if (addEntryToUnrankedTier(entry)) {
				rankedCount += 1
			}
		}

		return rankedCount
	}

	function checkOverlappingRanges(): string[] {
		return findOverlappingTierRanges(tiers.value)
	}

	function autoRankAll(allowDuplicates = false): void {
		const overlaps = checkOverlappingRanges()
		if (overlaps.length > 0 && !allowDuplicates) {
			throw new Error("OVERLAPPING_RANGES")
		}
		const entriesToRank = uniqueEntries([
			...unrankedTier.value,
			...tiers.value.flatMap(tier => tier.entries)
		])
		unrankedTier.value = []
		for (const tier of tiers.value) tier.entries = []
		rankEntries(entriesToRank, allowDuplicates)
	}

	function unrankAll(): void {
		unrankedTier.value = uniqueEntries([
			...unrankedTier.value,
			...tiers.value.flatMap(tier => tier.entries)
		]).slice(0, MAX_TIERLIST_ENTRIES_PER_LANE)
		for (const tier of tiers.value) tier.entries = []
	}

	function removeEntry(mediaId: number, laneId: TierlistLaneId): TierlistEntry | null {
		const entries = laneEntries(laneId)
		if (!entries) return null
		const index = entries.findIndex(entry => entry.media.id === mediaId)
		if (index < 0) return null
		return entries.splice(index, 1)[0] ?? null
	}

	function moveEntry(
		mediaId: number,
		fromLaneId: TierlistLaneId,
		toLaneId: TierlistLaneId
	): boolean {
		if (fromLaneId === toLaneId) return false
		const targetEntries = laneEntries(toLaneId)
		if (!targetEntries || targetEntries.length >= MAX_TIERLIST_ENTRIES_PER_LANE) return false
		if (targetEntries.some(entry => entry.media.id === mediaId)) return false

		const entry = removeEntry(mediaId, fromLaneId)
		if (!entry) return false
		targetEntries.push(entry)
		return true
	}

	function reorderEntry(mediaId: number, laneId: TierlistLaneId, direction: -1 | 1): boolean {
		const entries = laneEntries(laneId)
		if (!entries) return false
		const currentIndex = entries.findIndex(entry => entry.media.id === mediaId)
		const targetIndex = currentIndex + direction
		if (currentIndex < 0 || targetIndex < 0 || targetIndex >= entries.length) return false
		const entry = entries.splice(currentIndex, 1)[0]
		if (!entry) return false
		entries.splice(targetIndex, 0, entry)
		return true
	}

	function getMoveTargets(currentLaneId: TierlistLaneId): TierlistMoveTarget[] {
		return [
			...tiers.value.map(tier => ({ id: tier.id, label: tier.name })),
			{ id: "unranked", label: "Unranked" }
		].filter(target => target.id !== currentLaneId)
	}

	function getAdjacentLane(
		currentLaneId: TierlistLaneId,
		direction: -1 | 1
	): TierlistLaneId | null {
		const laneIds: TierlistLaneId[] = [...tiers.value.map(tier => tier.id), "unranked"]
		const currentIndex = laneIds.indexOf(currentLaneId)
		return laneIds[currentIndex + direction] ?? null
	}

	function applySnapshot(snapshot: TierlistSnapshot): void {
		const normalized = createTierlistSnapshot(snapshot)
		tiers.value = normalized.tiers
		unrankedTier.value = normalized.unranked
		currentTemplate.value = normalized.settings.currentTemplate
		gapSize.value = normalized.settings.gapSize
		headingCorner.value = normalized.settings.headingCorner
		rowCorner.value = normalized.settings.rowCorner
		colWidth.value = normalized.settings.colWidth
		selectedBackground.value = normalized.settings.selectedBackground
		nbCol.value = normalized.settings.nbCol
	}

	function getSnapshot(): TierlistSnapshot {
		return createTierlistSnapshot({
			tiers: tiers.value,
			unranked: unrankedTier.value,
			settings: {
				currentTemplate: currentTemplate.value,
				gapSize: gapSize.value,
				headingCorner: headingCorner.value,
				rowCorner: rowCorner.value,
				colWidth: colWidth.value,
				selectedBackground: selectedBackground.value,
				nbCol: nbCol.value
			}
		})
	}

	return {
		templates,
		currentTemplate,
		tiers,
		unrankedTier,
		gapSize,
		headingCorner,
		rowCorner,
		colWidth,
		selectedBackground,
		filterTitle,
		filterGenres,
		filterYears,
		filterSeasons,
		filterFormats,
		filterScore,
		nbCol,
		neutralBackgrounds,
		gapSizeText,
		gapSizeClass,
		rowCornerClass,
		colWidthClass,
		bodyColWidthClass,
		nbColClass,
		entryCount,
		setBackground,
		setGapSize,
		setHeadingCorner,
		setRowCorner,
		setColWidth,
		setFilterScore,
		setDefaultBackgroundForTheme,
		addEntryToUnrankedTier,
		addEntryToLane,
		changeTemplate,
		addTier,
		removeTier,
		moveTierUp,
		moveTierDown,
		addAnime,
		importAnimesFromEntries,
		rankEntries,
		checkOverlappingRanges,
		autoRankAll,
		unrankAll,
		removeEntry,
		moveEntry,
		reorderEntry,
		getMoveTargets,
		getAdjacentLane,
		applySnapshot,
		getSnapshot
	}
}, {
	persist: {
		storage: piniaPluginPersistedstate.localStorage(),
		pick: [
			"currentTemplate",
			"tiers",
			"unrankedTier",
			"gapSize",
			"headingCorner",
			"rowCorner",
			"colWidth",
			"selectedBackground",
			"nbCol"
		],
		serializer: {
			serialize: serializeTierlistState,
			deserialize: deserializeTierlistState
		}
	}
})

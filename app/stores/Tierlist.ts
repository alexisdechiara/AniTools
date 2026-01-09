import { defineStore } from "pinia"
import type { CommandPaletteItem } from "@nuxt/ui"
import { defaultTierlistTemplateIndex, tierlistTemplates } from "~/utils/tierlist-templates"
import { colWidthToClass, gapSizeToClass, gapSizeToText, getTierlistNeutralBackgrounds, rowCornerToClass } from "~/utils/tierlist"

interface Tier {
	name: string
	color: string
	range: Array<number>
	entries: Array<unknown>
}

export const useTierlistStore = defineStore("tierlist", () => {
	// State
	const templates = ref(tierlistTemplates)
	const currentTemplate = ref(defaultTierlistTemplateIndex)
	const tiers = ref<Tier[]>(templates.value[currentTemplate.value]?.value.map(t => ({ ...t, entries: [] })) ?? [])

	const unrankedTier = ref<unknown[]>([])

	const gapSize = ref(50)
	const headingCorner = ref(true)
	const rowCorner = ref(6)
	const colWidth = ref(0)

	const filterTitle = ref("")
	const filterGenres = ref<string[]>([])
	const filterYears = ref<number[]>([])
	const filterSeasons = ref<string[]>([])
	const filterFormats = ref<string[]>([])
	const filterScore = ref<[number, number]>([0, 100])

	const colorMode = useColorMode()
	const selectedBackground = ref(colorMode.value === "dark" ? "bg-neutral-900" : "bg-neutral-100")

	// Getters
	const neutralBackgrounds = computed(() => {
		return getTierlistNeutralBackgrounds(colorMode.value === "dark" ? "dark" : "light")
	})

	const gapSizeText = computed(() => gapSizeToText(gapSize.value))
	const gapSizeClass = computed(() => gapSizeToClass(gapSize.value))
	const rowCornerClass = computed(() => rowCornerToClass(rowCorner.value))
	const colWidthClass = computed(() => colWidthToClass(colWidth.value))

	// Actions
	function setBackground(color: string) {
		selectedBackground.value = color
	}

	function setGapSize(size: number) {
		gapSize.value = size
	}

	function setHeadingCorner(enabled: boolean) {
		headingCorner.value = enabled
	}

	function setRowCorner(corner: number) {
		rowCorner.value = corner
	}

	function setColWidth(width: number) {
		colWidth.value = width
	}

	function setFilterScore(range: [number, number]) {
		filterScore.value = range
	}

	function setDefaultBackgroundForTheme() {
		selectedBackground.value = colorMode.value === "dark" ? "bg-neutral-900" : "bg-neutral-100"
	}

	function addEntryToUnrankedTier(entry: unknown) {
		unrankedTier.value.push(entry)
	}

	function changeTemplate(index: number) {
		const tpl = templates.value[index]
		if (!tpl) return
		currentTemplate.value = index
		const newTiers: Tier[] = tpl.value.map(t => ({ ...t, entries: [] }))
		const allEntries = [...unrankedTier.value, ...tiers.value.flatMap(t => t.entries)]
		unrankedTier.value = allEntries
		tiers.value = newTiers
	}

	function addTier() {
		tiers.value.push({ name: "New tier", color: "bg-neutral-500", range: [0, 0], entries: [] })
	}

	function removeTier(index: number) {
		if (index >= 0 && index < tiers.value.length) {
			// Déplacer les entrées du tier supprimé vers unranked
			const tierToRemove = tiers.value[index]
			unrankedTier.value.push(...tierToRemove?.entries ?? [])
			tiers.value.splice(index, 1)
		}
	}

	function moveTierUp(index: number) {
		if (index > 0 && index < tiers.value.length) {
			// Échanger le tier avec celui du dessus
			const tier = tiers.value[index]
			if (tier) {
				tiers.value.splice(index, 1)
				tiers.value.splice(index - 1, 0, tier)
			}
		}
	}

	function moveTierDown(index: number) {
		if (index >= 0 && index < tiers.value.length - 1) {
			// Échanger le tier avec celui du dessous
			const tier = tiers.value[index]
			if (tier) {
				tiers.value.splice(index, 1)
				tiers.value.splice(index + 1, 0, tier)
			}
		}
	}

	async function addAnime(item: CommandPaletteItem) {
		const userStore = useUserStore()
		const { getAllAnimes } = storeToRefs(useEntriesStore())
		if (getAllAnimes.value.some(entry => entry?.media?.id === item.id)) {
			console.log("Anime already in list", item.id)
			addEntryToUnrankedTier(getAllAnimes.value.find(entry => entry?.media?.id === item.id)!)
		} else {
			const { data } = await useAsyncGql({
				operation: "getMediaById",
				variables: { mediaId: item.id, scoreFormat: userStore.mediaListOptions.scoreFormat }
			})
			console.log("Anime added", formatMediaToEntry(data.value))
			addEntryToUnrankedTier(formatMediaToEntry(data.value))
		}
	}

	function importAnimesFromEntries(autoRank: boolean, scoreRange: [number, number], allowDuplicates = false) {
		const entriesStore = useEntriesStore()
		const { getAllAnimes, isInitialized } = storeToRefs(entriesStore)

		console.log("Import started:", { autoRank, scoreRange })
		console.log("Entries initialized:", isInitialized.value)
		console.log("All animes count:", getAllAnimes.value.length)

		// Vérifier si les données sont chargées
		if (!isInitialized.value || getAllAnimes.value.length === 0) {
			console.warn("No animes available for import. Make sure the entries store is initialized.")
			return
		}

		// Récupérer tous les IDs déjà présents dans les tiers et unranked
		const existingIds = new Set<number>()
		tiers.value.forEach((tier) => {
			tier.entries.forEach((entry) => {
				const mediaId = (entry as any)?.media?.id
				if (mediaId) {
					existingIds.add(mediaId)
				}
			})
		})
		unrankedTier.value.forEach((entry) => {
			const mediaId = (entry as any)?.media?.id
			if (mediaId) {
				existingIds.add(mediaId)
			}
		})

		console.log("Existing entries count:", existingIds.size)

		// Filtrer les animes par score range ET par IDs non existants
		const filteredAnimes = getAllAnimes.value.filter((entry) => {
			const score = entry?.score || 0
			const inRange = score >= scoreRange[0] && score <= scoreRange[1]
			const mediaId = entry?.media?.id
			const notDuplicate = mediaId && !existingIds.has(mediaId)

			console.log(`Anime: ${entry?.media?.title?.romaji}, Score: ${score}, In range: ${inRange}, Not duplicate: ${notDuplicate}`)
			return inRange && notDuplicate
		})

		console.log("Filtered animes count (no duplicates):", filteredAnimes.length)

		if (autoRank) {
			// Utiliser la fonction factorisée pour placer automatiquement
			rankEntries(filteredAnimes, allowDuplicates)
		} else {
			// Ajouter tout au unranked tier
			filteredAnimes.forEach((entry) => {
				addEntryToUnrankedTier(entry)
				console.log(`Added to unranked: ${entry?.media?.title?.romaji}`)
			})
		}

		console.log("Import completed")
	}

	function rankEntries(entries: unknown[], allowDuplicates = false) {
		console.log(`Ranking ${entries.length} entries...`)

		if (entries.length === 0) {
			console.log("No entries to rank")
			return
		}

		// Vérifier les incohérences dans les ranges
		const overlappingRanges = checkOverlappingRanges()

		if (overlappingRanges.length > 0 && !allowDuplicates) {
			console.warn("Overlapping ranges detected:", overlappingRanges)
			// La popup sera gérée au niveau du composant
			throw new Error("OVERLAPPING_RANGES")
		}

		// Placer chaque entrée dans le(s) tier(s) approprié(s) selon son score
		entries.forEach((entry) => {
			const score = (entry as any)?.score || 0
			const matchingTiers = tiers.value.filter(tier =>
				tier && tier.range && score >= (tier.range[0] || 0) && score <= (tier.range[1] || 100)
			)

			console.log(`Ranking: ${(entry as any)?.media?.title?.romaji}, Score: ${score}, Matching tiers: ${matchingTiers.map(t => t.name).join(", ")}`)

			if (matchingTiers.length > 0) {
				if (matchingTiers.length > 1 && allowDuplicates) {
					// Dupliquer l'entrée dans tous les tiers correspondants
					matchingTiers.forEach((tier) => {
						// Vérifier si l'entrée n'existe pas déjà dans ce tier
						const entryId = (entry as any)?.media?.id
						const alreadyExists = tier.entries.some((existingEntry: any) =>
							(existingEntry as any)?.media?.id === entryId
						)

						if (!alreadyExists) {
							tier.entries.push(entry)
							console.log(`Added to tier: ${tier.name}`)
						} else {
							console.log(`Entry already exists in tier: ${tier.name}, skipping`)
						}
					})
				} else if (matchingTiers.length === 1) {
					// Ajouter au seul tier correspondant
					const targetTier = matchingTiers[0]
					if (targetTier) {
						// Vérifier si l'entrée n'existe pas déjà dans ce tier
						const entryId = (entry as any)?.media?.id
						const alreadyExists = targetTier.entries.some((existingEntry: any) =>
							(existingEntry as any)?.media?.id === entryId
						)

						if (!alreadyExists) {
							targetTier.entries.push(entry)
							console.log(`Added to tier: ${targetTier.name}`)
						} else {
							console.log(`Entry already exists in tier: ${targetTier.name}, skipping`)
						}
					}
				} else {
					// Plusieurs tiers mais pas de duplication autorisée, ajouter à unranked
					addEntryToUnrankedTier(entry)
					console.log(`Multiple matching tiers but no duplicates allowed, kept in unranked`)
				}
			} else {
				// Si aucun tier ne correspond, ajouter à unranked
				addEntryToUnrankedTier(entry)
				console.log(`No matching tier found for ${(entry as any)?.media?.title?.romaji}, kept in unranked`)
			}
		})

		console.log("Ranking completed")
	}

	function checkOverlappingRanges(): string[] {
		const overlaps: string[] = []

		for (let i = 0; i < tiers.value.length; i++) {
			for (let j = i + 1; j < tiers.value.length; j++) {
				const tier1 = tiers.value[i]
				const tier2 = tiers.value[j]

				if (tier1?.range && tier2?.range) {
					const range1Start = tier1.range[0] || 0
					const range1End = tier1.range[1] || 100
					const range2Start = tier2.range[0] || 0
					const range2End = tier2.range[1] || 100

					// Vérifier si les ranges se chevauchent
					if (!(range1End < range2Start || range2End < range1Start)) {
						overlaps.push(`${tier1.name} (${range1Start}-${range1End}) overlaps with ${tier2.name} (${range2Start}-${range2End})`)
					}
				}
			}
		}

		return overlaps
	}

	function autoRankAll() {
		console.log("Auto-ranking all entries...")

		// Récupérer toutes les entrées du unranked tier
		const entriesToRank = [...unrankedTier.value]

		// Vider le unranked tier
		unrankedTier.value = []

		// Utiliser la fonction factorisée
		rankEntries(entriesToRank)
	}

	function unrankAll() {
		console.log("Unranking all entries...")

		// Récupérer toutes les entrées de tous les tiers
		const allEntries: unknown[] = []

		tiers.value.forEach((tier) => {
			const entries = [...tier.entries]
			allEntries.push(...entries)
			tier.entries = [] // Vider le tier
		})

		// Ajouter toutes les entrées au unranked tier
		unrankedTier.value.push(...allEntries)

		console.log(`Unranked ${allEntries.length} entries`)
	}

	return {
		// State
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

		// Getters
		neutralBackgrounds,
		gapSizeText,
		gapSizeClass,
		rowCornerClass,
		colWidthClass,

		// Actions
		setBackground,
		setGapSize,
		setHeadingCorner,
		setRowCorner,
		setColWidth,
		setFilterScore,
		setDefaultBackgroundForTheme,
		addEntryToUnrankedTier,
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
		unrankAll
	}
}, {
	persist: true
})

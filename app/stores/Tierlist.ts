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
		addAnime
	}
}, {
	persist: true
})

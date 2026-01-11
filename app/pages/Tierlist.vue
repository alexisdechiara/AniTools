<template>
	<UContainer class="overflow-auto">
		<UHeader title="" :ui="{ center: 'grow w-xs' }">
			<div class="flex items-center gap-2 w-full">
				<UModal v-model:open="openSearch">
					<UButton label="Search animes..." color="neutral" variant="outline" block icon="i-lucide-search">
						<template #trailing>
							<div class="hidden lg:flex items-center gap-0.5 ms-auto">
								<UKbd value="meta" variant="subtle" />
								<UKbd value="k" variant="subtle" />
							</div>
						</template>
					</UButton>
					<template #content>
						<UCommandPalette v-model:search-term="searchTerm" @input="onStopTyping" :loading="loadingSearch"
							:groups="groups" placeholder="Search users..." :ui="{ item: 'items-center', itemDescription: 'text-xs' }">
							<template #item-leading="{ item }">
								<NuxtImg :src="item.avatar?.src" class="size-10 rounded-md object-cover" />
							</template>
							<template #item-trailing="{ item }">
								<UButton icon="i-lucide-plus" variant="ghost" color="neutral" class="rounded-full cursor-pointer"
									@click.prevent="addAnime(item)" />
							</template>
						</UCommandPalette>
					</template>
				</UModal>
				<UPopover>
					<UButton icon="i-lucide-list-filter" variant="outline" color="neutral" size="md"
						:ui="{ base: 'p-2', leadingIcon: 'size-4' }" />
					<template #content>
						<div class="flex flex-col px-4 py-6 gap-y-2">
							<UFormField label="Search" class="mb-2">
								<UInput v-model="filterTitle" placeholder="Title" class="w-full" />
							</UFormField>
							<UFormField label="Filters" class="mb-2">
								<div class="flex flex-col gap-y-2">
									<USelectMenu v-model="filterGenres" multiple :items="tierlistGenres" placeholder="Genres"
										variant="outline" :ui="{ base: 'w-full' }" />
									<USelectMenu v-model="filterYears" multiple :items="tierlistYears" value-key="value"
										placeholder="Year" variant="outline" :ui="{ base: 'w-full' }" />
									<USelect v-model="filterSeasons" multiple :items="tierlistSeasons" value-key="value"
										placeholder="Season" variant="outline" :ui="{ base: 'w-full' }" />
									<USelect v-model="filterFormats" multiple :items="tierlistFormats" value-key="value"
										placeholder="Format" variant="outline" :ui="{ base: 'w-full' }" />
								</div>
							</UFormField>
							<UFormField label="Score">
								<USlider v-model="filterScore" :min="0" :max="100" :step="1" :ui="{ root: 'w-full' }" />
							</UFormField>
						</div>
					</template>
				</UPopover>
			</div>
			<template #left>
				<UDropdownMenu :items="settingsItems" :content="{ align: 'start' }">
					<UButton icon="i-lucide-ellipsis-vertical" variant="ghost" color="neutral" class="cursor-pointer" />
				</UDropdownMenu>
				<SlideoverSettings v-model:open="openSlideover" />
			</template>
			<template #right>
				<UButton :icon="isInspectorEnabled ? 'i-lucide-scan-eye' : 'i-lucide-scan'" class="cursor-pointer"
					:variant="isInspectorEnabled ? 'solid' : 'ghost'" color="neutral" size="md" @click="toggleInspector" />
			</template>
		</UHeader>
		<div class="flex flex-col mx-12 my-8" :class="[gapSizeClass]">
			<VueDraggable v-model="tiers" group="tier-list" handle=".grip-handle" ghostClass="opacity-50"
				class="flex flex-col" :class="[gapSizeClass]" :animation="300" :force-fallback="false" :fallback-on-body="true"
				:swap-threshold="0.65" :delay="0" :delay-on-touch-start="false">
				<RankedTier v-for="(tier, index) in tiers" :key="index" :tier="tier" :index="index" :isFirst="index === 0"
					:isLast="index === tiers.length - 1" />
			</VueDraggable>
			<div v-if="unrankedTier.length > 0" class="flex w-full min-h-32 mt-8"
				:class="[selectedBackground, rowCornerClass]">
				<DraggableTier v-model="unrankedTier" />
			</div>

			<UEmpty v-else ref="emptyDropZone" variant="outline" icon="i-lucide-file-question-mark" title="No animes left"
				class="mt-8"
				:ui="{ root: `border border-default border-dashed ring-0 min-h-32 flex items-center justify-center transition-colors ${isDragOver ? 'border-primary bg-primary/5' : ''}` }"
				@drop="handleAnimeDrop" @dragover="handleDragOver" @dragleave="handleDragLeave"
				description="If you want to add an anime, drop it here or choose one of the actions below." :actions="[
					{
						icon: 'i-lucide-search',
						label: 'Search',
						color: 'neutral',
						variant: 'subtle',
						onClick: () => {
							openSearch = true
						}
					}, {
						icon: 'i-lucide-cloud-download',
						label: 'Import from AniList',
						onClick: () => {
							openImport = true
						}
	},
				]" />
		</div>
	</UContainer>
	<AnimesImportModal v-model:open="openImport" />
	<InspectorOverlay />
	<InspectorCursorTooltip />
	<InspectorPopup />
</template>

<script lang="ts" setup>
import { VueDraggable } from "vue-draggable-plus"
import type { CommandPaletteItem, DropdownMenuItem } from '@nuxt/ui'
import { tierlistFormats, tierlistGenres, tierlistSeasons, tierlistYears } from "~/utils/tierlist-data"

const { isInspectorEnabled, toggleInspector, initializeInspector } = useInspector()

onMounted(() => {
	initializeInspector()
})

defineShortcuts({
	meta_k: () => openSearch.value = !openSearch.value
})

const openSearch = ref(false)
const openImport = ref(false)
const openSlideover = ref(false)

const tierlistStore = useTierlistStore()
const entriesStore = useEntriesStore()

const settingsItems: DropdownMenuItem[] = [
	{
		label: 'Configure tiers',
		icon: 'i-lucide-settings-2',
		onClick: () => openSlideover.value = true
	}, {
		label: 'Import',
		icon: 'i-lucide-cloud-download',
		onClick: () => openImport.value = true
	}, {
		label: 'Export',
		icon: 'i-lucide-download',
		children: [
			{
				label: 'JSON',
			},
			{
				label: 'JPEG',
			},
			{
				label: 'PNG',
			},
			{
				label: 'WEBP',
			}
		]
	}
]

// Initialiser le store Entries si nécessaire
onMounted(async () => {
	if (!entriesStore.isInitialized) {
		await entriesStore.fetchAllAnimes()
	}
})

const {
	filterTitle,
	filterGenres,
	filterYears,
	filterSeasons,
	filterFormats,
	filterScore,
	tiers,
	unrankedTier,
	gapSizeClass,
	selectedBackground,
	rowCornerClass,
} = storeToRefs(tierlistStore)

const { addEntryToUnrankedTier } = tierlistStore
const isDragOver = ref(false)

// Custom drop handler for anime items
function handleAnimeDrop(event: DragEvent) {
	event.preventDefault()
	isDragOver.value = false

	try {
		const data = event.dataTransfer?.getData('application/json')
		if (data) {
			const animeItem = JSON.parse(data)
			if (animeItem && animeItem.media) {
				// Supprimer l'anime de sa position d'origine (y compris unranked)
				removeAnimeFromOrigin(animeItem)
				// Ajouter l'anime au unranked tier
				addEntryToUnrankedTier(animeItem)
			}
		}
	} catch (error) {
		console.error('Error parsing dropped anime:', error)
	}
}

function removeAnimeFromOrigin(animeItem: any) {
	// Parcourir tous les tiers pour trouver et supprimer l'anime
	tiers.value.forEach(tier => {
		const index = tier.entries.findIndex((entry: any) => entry.id === animeItem.id)
		if (index > -1) {
			tier.entries.splice(index, 1)
		}
	})

	// Supprimer aussi du unrankedTier pour éviter les doublons
	const unrankedIndex = unrankedTier.value.findIndex((entry: any) => entry.id === animeItem.id)
	if (unrankedIndex > -1) {
		unrankedTier.value.splice(unrankedIndex, 1)
	}
}

function handleDragOver(event: DragEvent) {
	event.preventDefault()
	isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
	event.preventDefault()
	isDragOver.value = false
}

const searchTerm = ref('')
const rawAnimes = ref<any[]>([])
const loadingSearch = ref(false)

const onStopTyping = useDebounceFn(async () => {
	loadingSearch.value = true
	const { data, pending } = await useAsyncGql({
		operation: "search",
		variables: { search: searchTerm.value },
	})
	rawAnimes.value = data.value.anime?.results || []
	loadingSearch.value = pending.value
}, 500)

const SearchedAnimes = computed(() => {
	return rawAnimes.value.map(result => {
		if (!result) return null
		return {
			id: result.id,
			label: result.title?.english || result.title?.romaji || result.title?.native || '',
			description: (result.startDate.year || '') + ' ' + (result.format || ''),
			avatar: { src: result.coverImage?.medium || '' },
			to: `https://anilist.co/anime/${result.id}`,
			target: "_blank"
		}
	}) as CommandPaletteItem[] || []
})

const groups = computed(() => [{
	id: 'animes',
	label: "Animes",
	items: SearchedAnimes.value || [],
	ignoreFilter: true
}])

async function addAnime(item: CommandPaletteItem) {
	const tierlistStore = useTierlistStore()
	tierlistStore.addAnime(item)
}
</script>

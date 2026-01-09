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
										variant="soft" :ui="{ base: 'w-full' }" />
									<USelectMenu v-model="filterYears" multiple :items="tierlistYears" value-key="value"
										placeholder="Year" variant="soft" :ui="{ base: 'w-full' }" />
									<USelectMenu v-model="filterSeasons" multiple :items="tierlistSeasons" value-key="value"
										placeholder="Season" variant="soft" :ui="{ base: 'w-full' }" />
									<USelectMenu v-model="filterFormats" multiple :items="tierlistFormats" value-key="value"
										placeholder="Format" variant="soft" :ui="{ base: 'w-full' }" />
								</div>
							</UFormField>
							<UFormField label="Score">
								<USlider v-model="filterScore" :min="0" :max="100" :step="1" :ui="{ root: 'w-full' }" />
							</UFormField>
						</div>
					</template>
				</UPopover>
			</div>
			<template #right>
				<SlideoverSettings />
			</template>
			<template #left>
				<AnimesImportModal v-model:open="openImport" />
			</template>
		</UHeader>
		<div class="flex flex-col mx-12 my-8" :class="[gapSizeClass]">
			<RankedTier v-for="(tier, index) in tiers" :key="index" :tier="tier" />
			<div v-if="unrankedTier.length > 0" class="flex w-full min-h-32 mt-8"
				:class="[selectedBackground, rowCornerClass]">
				<DraggableTier v-model="unrankedTier" />
			</div>

			<UEmpty v-else variant="naked" icon="i-lucide-file" title="No animes left" class="mt-8"
				description="There are no anime to rank. If you want to add some, choose one of the actions below." :actions="[
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
</template>

<script lang="ts" setup>
import type { CommandPaletteItem } from '@nuxt/ui'
import { tierlistFormats, tierlistGenres, tierlistSeasons, tierlistYears } from "~/utils/tierlist-data"

defineShortcuts({
	meta_k: () => openSearch.value = !openSearch.value
})

const openSearch = ref(false)
const openImport = ref(false)

const tierlistStore = useTierlistStore()

const {
	tiers,
	unrankedTier,
	gapSizeClass,
	selectedBackground,
	rowCornerClass,
} = storeToRefs(tierlistStore)

const {
	filterTitle,
	filterGenres,
	filterYears,
	filterSeasons,
	filterFormats,
	filterScore
} = storeToRefs(tierlistStore)

const { addEntryToTier } = tierlistStore

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

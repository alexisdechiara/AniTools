<template>
	<UContainer class="overflow-auto">
		<UHeader title="" :ui="{ center: 'grow w-xs' }">
			<div class="flex items-center gap-2 w-full">
				<UModal>
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
									@click="console.log('ajout de l\'anime')" />
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
								<UInput placeholder="Title" class="w-full" />
							</UFormField>
							<UFormField label="Filters" class="mb-2">
								<div class="flex flex-col gap-y-2">
									<USelect placeholder="Genres" variant="soft" :ui="{ base: 'w-full' }" />
									<USelect placeholder="Year" variant="soft" :ui="{ base: 'w-full' }" />
									<USelect placeholder="Season" variant="soft" :ui="{ base: 'w-full' }" />
									<USelect placeholder="Format" variant="soft" :ui="{ base: 'w-full' }" />
								</div>
							</UFormField>
							<UFormField label="Score">
								<USlider v-model="value" :min="0" :max="100" :step="1" :ui="{ base: 'w-full' }" />
							</UFormField>
						</div>
					</template>
				</UPopover>
			</div>
			<template #right>
				<SlideoverSettings />
			</template>
		</UHeader>
		<div class="flex flex-col mx-12 my-8" :class="[gapSizeClass]">
			<div v-for="(tier, index) in tiers" :key="index" class="grid grid-cols-12 min-h-32 w-full overflow-hidden"
				:class="[selectedBackground, rowCornerClass]">
				<div class="bg-primary-500 text-inverted text-lg font-semibold size-full flex justify-center items-center"
					:class="[colWidthClass, headingCorner ? rowCornerClass : 'rounded-none']">
					{{ tier }}
				</div>
				<div class="col-span-auto size-full">
				</div>
			</div>
		</div>
	</UContainer>
</template>

<script lang="ts" setup>
import type { CommandPaletteItem } from '@nuxt/ui'

const settingsStore = useTierlistSettingsStore()

const {
	gapSizeClass,
	selectedBackground,
	rowCornerClass,
	colWidthClass,
	headingCorner
} = storeToRefs(settingsStore)


const tiers = ref(["S", "A", "B", "C"])
const value = ref(0)

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

const animes = computed(() => {
	return rawAnimes.value.map(result => {
		if (!result) return null
		return {
			id: result.id,
			label: result.title?.english || result.title?.romaji || result.title?.native || '',
			description: (result.startDate.year || '') + ' ' + (result.format || ''),
			avatar: { src: result.coverImage?.medium || '' },
			to: `https://anilist.co/anime/${result.id}`,
		}
	}) as CommandPaletteItem[] || []
})

const groups = computed(() => [{
	id: 'animes',
	label: "Animes",
	items: animes.value || [],
	ignoreFilter: true
}])

</script>

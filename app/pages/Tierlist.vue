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
				<USlideover title="Settings" :ui="{ content: 'max-w-xs' }">
					<UButton icon="i-lucide-palette" variant="ghost" color="neutral" />
					<template #content>
						<div class="p-4">
							<CollapseButton label="Rows" first>
								<UFormField label="Gap">
									<USlider v-model="gapSize" :step="25"
										:tooltip="{ text: gapSizeText, delayDuration: 0, ui: { text: 'uppercase font-semibold' } }" />
								</UFormField>
								<UFormField label="Rounded corner">
									<USlider v-model="rowCorner" :max="6" />
								</UFormField>
							</CollapseButton>
							<CollapseButton label="Heading">
								<UFormField orientation="horizontal" label="Rounded separator">
									<USwitch v-model="headingCorner" />
								</UFormField>
								<UFormField label="Width">
									<USlider v-model="colWidth" :max="4" />
								</UFormField>
							</CollapseButton>
							<CollapseButton label="Body">
								<UFormField label="Background color">
									<div class="flex gap-0.5">
										<div v-for="bg in neutralBackgrounds" :key="bg" @click="setBackground(bg)"
											class="size-6 first:rounded-l-xs transition-all hover:scale-110 cursor-pointer last:rounded-r-full flex justify-center items-center"
											:class="[bg, selectedBackground === bg ? 'ring-2 ring-offset-2 ring-primary z-50' : '']">
											<UTooltip text="Transparent" :delay="0">
												<Icon v-if="bg === 'bg-transparent'" name="i-lucide-ban" class="text-error" />
											</UTooltip>
										</div>
									</div>
								</UFormField>
							</CollapseButton>
						</div>
					</template>
				</USlideover>
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


const tiers = ref(["S", "A", "B", "C"])
const selectedBackground = ref("bg-neutral-100")
const value = ref(0)

const neutralBackgrounds = [
	"bg-transparent",
	"bg-neutral-50",
	"bg-neutral-100",
	"bg-neutral-200",
	"bg-neutral-300",
	"bg-neutral-400",
	"bg-neutral-500",
	"bg-neutral-600",
	"bg-neutral-700",
	"bg-neutral-800",
	"bg-neutral-900",
	"bg-neutral-950"
]

function setBackground(color: string) {
	selectedBackground.value = color
}

const gapSize = ref(50)
const gapSizeText = computed(() => {
	switch (gapSize.value) {
		case 0: return "xs"
		case 25: return "sm"
		case 50: return "md"
		case 75: return "lg"
		case 100: return "xl"
		default: return "md"
	}
})
const gapSizeClass = computed(() => {
	switch (gapSize.value) {
		case 0: return "gap-0"
		case 25: return "gap-3"
		case 50: return "gap-6"
		case 75: return "gap-12"
		case 100: return "gap-24"
		default: return "gap-8"
	}
})

const headingCorner = ref(true)

const rowCorner = ref(6)

const rowCornerClass = computed(() => {
	switch (rowCorner.value) {
		case 0: return "rounded-0"
		case 1: return "rounded-xs"
		case 2: return "rounded-sm"
		case 3: return "rounded-md"
		case 4: return "rounded-lg"
		case 5: return "rounded-xl"
		case 6: return "rounded-2xl"
		default: return "rounded-2xl"
	}
})

const colWidth = ref(0)
const colWidthClass = computed(() => {
	switch (colWidth.value) {
		case 0: return "col-span-1"
		case 1: return "col-span-2"
		case 2: return "col-span-3"
		case 3: return "col-span-4"
		case 4: return "col-span-5"
		default: return "col-span-1"
	}
})

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
}, 200)

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

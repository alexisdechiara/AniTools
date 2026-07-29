<template>
	<UDashboardPanel id="tierlist">
		<UContainer class="max-w-none">
			<input
				ref="jsonFileInput"
				type="file"
				accept=".json,application/json"
				class="hidden"
				@change="handleJsonFile">
			<UHeader title="" :ui="{ center: 'grow w-xs' }">
				<div class="flex w-full items-center gap-2">
					<UModal v-model:open="openSearch">
						<UButton
							label="Search anime..."
							color="neutral"
							variant="outline"
							block
							icon="i-lucide-search">
							<template #trailing>
								<div class="ms-auto hidden items-center gap-0.5 lg:flex">
									<UKbd value="meta" variant="subtle" />
									<UKbd value="k" variant="subtle" />
								</div>
							</template>
						</UButton>
						<template #content>
							<UCommandPalette
								v-model:search-term="searchTerm"
								:loading="loadingSearch"
								:groups="groups"
								placeholder="Search anime..."
								:ui="{ item: 'items-center', itemDescription: 'text-xs' }">
								<template #item-trailing="{ item }">
									<UButton
										icon="i-lucide-plus"
										variant="ghost"
										color="neutral"
										class="cursor-pointer rounded-full"
										:aria-label="`Add ${item.label}`"
										@click.prevent.stop="addAnime(item)" />
								</template>
							</UCommandPalette>
						</template>
					</UModal>
					<UPopover>
						<UButton
							icon="i-lucide-list-filter"
							variant="outline"
							color="neutral"
							size="md"
							aria-label="Filter tier list"
							:ui="{ base: 'p-2', leadingIcon: 'size-4' }" />
						<template #content>
							<div class="flex flex-col gap-y-2 px-4 py-6">
								<UFormField label="Search" class="mb-2">
									<UInput v-model="filterTitle" placeholder="Title" class="w-full" />
								</UFormField>
								<UFormField label="Filters" class="mb-2">
									<div class="flex flex-col gap-y-2">
										<USelectMenu v-model="filterGenres" multiple :items="tierlistGenres" placeholder="Genres" variant="outline" :ui="{ base: 'w-full' }" />
										<USelectMenu v-model="filterYears" multiple :items="tierlistYears" value-key="value" placeholder="Year" variant="outline" :ui="{ base: 'w-full' }" />
										<USelect v-model="filterSeasons" multiple :items="tierlistSeasons" value-key="value" placeholder="Season" variant="outline" :ui="{ base: 'w-full' }" />
										<USelect v-model="filterFormats" multiple :items="tierlistFormats" value-key="value" placeholder="Format" variant="outline" :ui="{ base: 'w-full' }" />
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
						<UButton
							icon="i-lucide-ellipsis-vertical"
							variant="ghost"
							color="neutral"
							aria-label="Tier list actions"
							class="cursor-pointer" />
					</UDropdownMenu>
					<SlideoverSettings v-model:open="openSlideover" />
				</template>
				<template #right>
					<UButton
						:icon="isInspectorEnabled ? 'i-lucide-scan-eye' : 'i-lucide-scan'"
						class="cursor-pointer"
						:variant="isInspectorEnabled ? 'solid' : 'ghost'"
						color="neutral"
						size="md"
						aria-label="Toggle tier list inspector"
						@click="toggleInspector" />
				</template>
			</UHeader>

			<div class="my-6 ml-8 flex flex-col sm:mx-4 sm:my-8 lg:mx-12" :class="gapSizeClass">
				<VueDraggable
					v-model="tiers"
					group="tier-list"
					handle="[data-tier-handle]"
					ghost-class="opacity-50"
					class="flex flex-col"
					:class="gapSizeClass"
					:animation="300"
					:force-fallback="false"
					:fallback-on-body="true"
					:swap-threshold="0.65"
					:delay="180"
					:delay-on-touch-start="true">
					<RankedTier
						v-for="(tier, index) in tiers"
						:key="tier.id"
						:tier="tier"
						:index="index"
						:is-first="index === 0"
						:is-last="index === tiers.length - 1"
						@update:name="tier.name = $event"
						@update:entries="tier.entries = $event" />
				</VueDraggable>

				<div
					v-if="unrankedTier.length > 0"
					class="mt-8 flex min-h-32 w-full"
					:class="[selectedBackground, rowCornerClass]">
					<DraggableTier v-model="unrankedTier" lane-id="unranked" />
				</div>
				<UEmpty
					v-else
					variant="outline"
					icon="i-lucide-file-question-mark"
					title="No unranked anime"
					class="mt-8"
					:ui="{ root: `border border-default border-dashed ring-0 min-h-32 flex items-center justify-center transition-colors ${isDragOver ? 'border-primary bg-primary/5' : ''}` }"
					description="Drop an anime here, search for one, or import your AniList collection."
					:actions="emptyActions"
					@drop="handleAnimeDrop"
					@dragover="handleDragOver"
					@dragleave="handleDragLeave" />
			</div>
		</UContainer>
		<AnimesImportModal v-model:open="openImport" />
		<InspectorOverlay />
		<InspectorCursorTooltip />
		<InspectorPopup />
	</UDashboardPanel>
</template>

<script lang="ts" setup>
import type { CommandPaletteItem, DropdownMenuItem } from "@nuxt/ui"
import { VueDraggable } from "vue-draggable-plus"
import { FEATURE_REGISTRY } from "#shared/config/features"
import type { TierlistImageFormat } from "~/utils/tierlist-export"
import {
	buildTierlistFilename,
	createTierlistJsonBlob,
	downloadTierlistBlob,
	renderTierlistImage
} from "~/utils/tierlist-export"
import {
	MAX_TIERLIST_IMPORT_BYTES,
	parseTierlistDragPayload,
	parseTierlistExportText
} from "~/utils/tierlist-model"
import {
	tierlistFormats,
	tierlistGenres,
	tierlistSeasons,
	tierlistYears
} from "~/utils/tierlist-data"

interface SearchPrediction {
	id: number
	title: string
}

interface SearchResponse {
	result: {
		predictions: SearchPrediction[]
	}
}

definePageMeta({
	feature: "tierlist",
	auth: FEATURE_REGISTRY.tierlist.access,
	indexable: FEATURE_REGISTRY.tierlist.indexable
})

const seo = {
	title: "Anime Tier List",
	description: "Build, import and export an accessible anime tier list with filters and automatic ranking."
}

useSeoMeta({
	title: seo.title,
	description: seo.description,
	ogTitle: seo.title,
	ogDescription: seo.description
})

const toast = useToast()
const tierlistStore = useTierlistStore()
const entriesStore = useEntriesStore()
const userStore = useUserStore()
const { isInspectorEnabled, toggleInspector, initializeInspector } = useInspector()
const { isAuthenticated } = storeToRefs(userStore)

const openSearch = ref(false)
const openImport = ref(false)
const openSlideover = ref(false)
const jsonFileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const exportingFormat = ref<"json" | TierlistImageFormat | null>(null)
const searchTerm = ref("")
const rawAnimes = ref<SearchPrediction[]>([])
const loadingSearch = ref(false)

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
	rowCornerClass
} = storeToRefs(tierlistStore)

defineShortcuts({
	meta_k: () => {
		openSearch.value = !openSearch.value
	}
})

onMounted(initializeInspector)

watch(isAuthenticated, async (authenticated) => {
	if (!authenticated || entriesStore.isInitialized) return
	try {
		await entriesStore.fetchAllAnimes()
	} catch {
		toast.add({
			title: "AniList import unavailable",
			description: "Your list could not be loaded. You can still build the tier list manually.",
			color: "warning"
		})
	}
}, { immediate: true })

const runSearch = useDebounceFn(async () => {
	const query = searchTerm.value.trim()
	if (query.length < 2) {
		rawAnimes.value = []
		return
	}

	loadingSearch.value = true
	try {
		const response = await $fetch<SearchResponse>("/api/search", {
			query: { q: query }
		})
		rawAnimes.value = response.result.predictions
	} catch {
		rawAnimes.value = []
		toast.add({
			title: "Search unavailable",
			description: "AniList could not be reached. Try again in a moment.",
			color: "error"
		})
	} finally {
		loadingSearch.value = false
	}
}, 400)

watch(searchTerm, runSearch)

const searchedAnimes = computed<CommandPaletteItem[]>(() =>
	rawAnimes.value.map(result => ({
		id: result.id,
		label: result.title,
		to: `https://anilist.co/anime/${result.id}`,
		target: "_blank"
	}))
)

const groups = computed(() => [{
	id: "animes",
	label: "Anime",
	items: searchedAnimes.value,
	ignoreFilter: true
}])

const emptyActions = computed(() => [
	{
		icon: "i-lucide-search",
		label: "Search",
		color: "neutral" as const,
		variant: "subtle" as const,
		onClick: () => {
			openSearch.value = true
		}
	},
	{
		icon: "i-lucide-cloud-download",
		label: "Import from AniList",
		onClick: () => {
			openImport.value = true
		}
	}
])

const settingsItems = computed<DropdownMenuItem[]>(() => [
	{
		label: "Configure tiers",
		icon: "i-lucide-settings-2",
		onClick: () => {
			openSlideover.value = true
		}
	},
	{
		label: "Import from AniList",
		icon: "i-lucide-cloud-download",
		onClick: () => {
			openImport.value = true
		}
	},
	{
		label: "Import JSON",
		icon: "i-lucide-file-up",
		onClick: () => jsonFileInput.value?.click()
	},
	{
		label: exportingFormat.value ? `Exporting ${exportingFormat.value.toUpperCase()}…` : "Export",
		icon: exportingFormat.value ? "i-lucide-loader-circle" : "i-lucide-download",
		disabled: exportingFormat.value !== null,
		children: [
			{ label: "JSON", onClick: () => exportTierlist("json") },
			{ label: "PNG", onClick: () => exportTierlist("png") },
			{ label: "JPEG", onClick: () => exportTierlist("jpeg") },
			{ label: "WebP", onClick: () => exportTierlist("webp") }
		]
	}
])

async function addAnime(item: CommandPaletteItem): Promise<void> {
	try {
		const added = await tierlistStore.addAnime(item)
		toast.add({
			title: added ? "Anime added" : "Anime not added",
			description: added ? undefined : "It may already be present in this tier list.",
			color: added ? "success" : "warning"
		})
		if (added) openSearch.value = false
	} catch {
		toast.add({
			title: "Anime not added",
			description: "AniList could not be reached.",
			color: "error"
		})
	}
}

function handleAnimeDrop(event: DragEvent): void {
	event.preventDefault()
	isDragOver.value = false
	const serialized = event.dataTransfer?.getData("application/json")
	if (!serialized) return

	const payload = parseTierlistDragPayload(serialized)
	if (!payload) {
		toast.add({ title: "Invalid dropped item", color: "error" })
		return
	}
	tierlistStore.moveEntry(payload.entry.media.id, payload.sourceLaneId, "unranked")
}

function handleDragOver(event: DragEvent): void {
	event.preventDefault()
	isDragOver.value = true
}

function handleDragLeave(event: DragEvent): void {
	event.preventDefault()
	isDragOver.value = false
}

async function exportTierlist(format: "json" | TierlistImageFormat): Promise<void> {
	exportingFormat.value = format
	try {
		const snapshot = tierlistStore.getSnapshot()
		const blob = format === "json"
			? createTierlistJsonBlob(snapshot)
			: await renderTierlistImage(snapshot, format)
		downloadTierlistBlob(blob, buildTierlistFilename(format))
		toast.add({
			title: `${format.toUpperCase()} export ready`,
			color: "success"
		})
	} catch (error) {
		toast.add({
			title: "Export failed",
			description: error instanceof Error ? error.message : "The export could not be created.",
			color: "error"
		})
	} finally {
		exportingFormat.value = null
	}
}

async function handleJsonFile(event: Event): Promise<void> {
	const input = event.target
	if (!(input instanceof HTMLInputElement)) return
	const file = input.files?.[0]
	input.value = ""
	if (!file) return

	if (file.size > MAX_TIERLIST_IMPORT_BYTES) {
		toast.add({ title: "The selected file is too large", color: "error" })
		return
	}

	try {
		const parsed = parseTierlistExportText(await file.text())
		if (!parsed.success) {
			toast.add({
				title: "Import failed",
				description: parsed.error,
				color: "error"
			})
			return
		}
		if (
			tierlistStore.entryCount > 0
			&& !window.confirm("Replace the current tier list with this JSON file?")
		) return
		tierlistStore.applySnapshot(parsed.data)
		toast.add({ title: "Tier list imported", color: "success" })
	} catch {
		toast.add({
			title: "Import failed",
			description: "The selected file could not be read.",
			color: "error"
		})
	}
}
</script>

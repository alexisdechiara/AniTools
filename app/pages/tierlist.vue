<template>
	<UDashboardPanel id="tierlist">
		<UContainer class="max-w-none">
			<input
				ref="jsonFileInput"
				type="file"
				accept=".json,application/json"
				class="hidden"
				@change="handleJsonFile">
			<PageLoadingState
				v-if="showPageLoader"
				label="Restoring your tier list"
				description="Applying your saved tiers and preparing drag and drop." />
			<div v-show="!showPageLoader">
				<div data-tier-toolbar class="ml-8 sm:mx-4 lg:mx-12">
					<UHeader
						title=""
						:ui="{
							center: 'w-xs grow',
							container: 'max-w-none px-0 sm:px-0 lg:px-0'
						}">
				<div class="flex w-full items-center gap-2">
					<UModal
						v-model:open="openSearch"
						:ui="{ content: 'sm:max-w-4xl' }">
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
							<AnimePicker
								:suggestions="searchSuggestions"
								:excluded-ids="tierlistMediaIds"
								action-label="Add"
								empty-label="Search AniList or load a profile to see anime here."
								@select="addAnime" />
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
				</div>

			<div data-tier-board class="my-6 ml-8 flex flex-col sm:mx-4 sm:my-8 lg:mx-12" :class="gapSizeClass">
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
					:delay-on-touch-only="true">
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
					data-unranked-tier
					class="mt-8 flex min-h-32 w-full"
					:class="rowCornerClass">
					<DraggableTier v-model="unrankedTier" lane-id="unranked">
						<template #empty>
							<UEmpty
								data-tier-empty
								variant="outline"
								icon="i-lucide-file-question-mark"
								title="No unranked anime"
								class="col-span-full min-h-24"
								:ui="{ root: 'border border-default border-dashed ring-0 flex items-center justify-center' }"
								description="Drop an anime here, search for one, or import your AniList collection."
								:actions="emptyActions"/>
						</template>
					</DraggableTier>
				</div>
			</div>
			</div>
		</UContainer>
		<AnimesImportModal v-model:open="openImport" />
		<InspectorOverlay />
		<InspectorCursorTooltip />
		<InspectorPopup />
	</UDashboardPanel>
</template>

<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui"
import { VueDraggable } from "vue-draggable-plus"
import { FEATURE_REGISTRY } from "#shared/config/features"
import type { AniListMediaSummary } from "~~/shared/types/anilist"
import type { TierlistImageFormat } from "~/utils/tierlist-export"
import {
	buildTierlistFilename,
	createTierlistJsonBlob,
	downloadTierlistBlob,
	renderTierlistImage
} from "~/utils/tierlist-export"
import {
	MAX_TIERLIST_IMPORT_BYTES,
	parseTierlistExportText
} from "~/utils/tierlist-model"
import {
	tierlistFormats,
	tierlistGenres,
	tierlistSeasons,
	tierlistYears
} from "~/utils/tierlist-data"

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
const { getAllAnimes } = storeToRefs(entriesStore)

const openSearch = ref(false)
const openImport = ref(false)
const openSlideover = ref(false)
const jsonFileInput = ref<HTMLInputElement | null>(null)
const exportingFormat = ref<"json" | TierlistImageFormat | null>(null)
const tierlistReady = ref(false)
const { showPageLoader } = useProgressiveLoading(
	computed(() => [tierlistReady.value]),
	{ allowPartial: false }
)

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
	rowCornerClass
} = storeToRefs(tierlistStore)

defineShortcuts({
	meta_k: () => {
		openSearch.value = !openSearch.value
	}
})

onMounted(async () => {
	initializeInspector()
	await nextTick()
	requestAnimationFrame(() => {
		tierlistReady.value = true
	})
})

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

const searchSuggestions = computed(() => getAllAnimes.value.flatMap(entry =>
	entry.media ? [entry.media] : []
))
const tierlistMediaIds = computed(() => [
	...unrankedTier.value,
	...tiers.value.flatMap(tier => tier.entries)
].map(entry => entry.media.id))

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

async function addAnime(media: AniListMediaSummary): Promise<void> {
	try {
		const added = tierlistStore.addAnimeMedia(media)
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

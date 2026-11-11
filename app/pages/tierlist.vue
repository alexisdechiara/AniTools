<template>
	<!-- #main-content is the scroller; the panel's own overflow would trap the sticky toolbar and tray. -->
	<UDashboardPanel id="tierlist" class="overflow-visible!">
		<UContainer class="max-w-none">
			<PageHeader title="Anime tier list" class="ml-8 pt-4 sm:mx-4 lg:mx-12" />
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
			<!-- v-if, not v-show: the board depends on the persisted store, which only exists on the client. -->
			<div v-if="!showPageLoader">
				<!-- One always-visible row: no collapsed menu, so search stays reachable on phones. -->
				<div
					data-tier-toolbar
					class="sticky top-0 z-30 mt-3 ml-8 flex items-center gap-2 bg-default/90 py-2 backdrop-blur sm:mx-4 lg:mx-12">
					<UDropdownMenu :items="settingsItems" :content="{ align: 'start' }">
						<UButton
							icon="i-lucide-sliders-horizontal"
							label="Options"
							variant="outline"
							color="neutral"
							aria-label="Tier list options"
							class="shrink-0 cursor-pointer" />
					</UDropdownMenu>
					<SlideoverSettings v-model:open="openSlideover" />
					<UModal
						v-model:open="openSearch"
						title="Add anime"
						description="Search AniList, then press Enter to add the highlighted anime to Unranked."
						:content="{ onCloseAutoFocus: revealLastAdded }"
						:ui="{ content: 'sm:max-w-4xl' }">
						<UButton
							aria-label="Search anime..."
							color="neutral"
							variant="outline"
							icon="i-lucide-search"
							class="min-w-0 flex-1 lg:mx-auto lg:max-w-xl">
							<span class="truncate sm:hidden">Search</span>
							<span class="hidden truncate sm:inline">Search anime...</span>
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
								multiple
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
							class="shrink-0"
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
					<UTooltip text="Click a tier, row or anime to restyle it">
						<UButton
							icon="i-lucide-paintbrush"
							:label="isInspectorEnabled ? 'Done' : 'Customize'"
							:aria-label="isInspectorEnabled ? 'Done customizing' : 'Customize'"
							class="shrink-0 cursor-pointer"
							:variant="isInspectorEnabled ? 'solid' : 'ghost'"
							color="neutral"
							size="md"
							:aria-pressed="isInspectorEnabled"
							:ui="{ label: 'hidden sm:inline' }"
							@click="toggleInspector" />
					</UTooltip>
				</div>

			<UAlert
				v-if="tierlistStore.entryCount === 0"
				data-tierlist-onboarding
				icon="i-lucide-sparkles"
				title="Start your tier list"
				description="Import your AniList collection to fill the tiers from your own scores, or search for anime to place by hand."
				color="primary"
				variant="soft"
				class="mt-4 ml-8 w-auto sm:mx-4 lg:mx-12"
				:actions="emptyActions" />

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

				<!-- Stays last in the DOM (arrow keys walk the lanes top to bottom, Unranked last) and
					sticks to the bottom of the scroll area so the pool is reachable from any tier. -->
				<section
					data-unranked-tier
					aria-labelledby="unranked-heading"
					class="sticky bottom-0 z-30 mt-4 -mr-2 -ml-8 flex max-h-[42svh] flex-col border-t border-default bg-default/95 py-3 pr-2 pl-8 backdrop-blur sm:-ml-2 sm:pl-2">
					<h2 id="unranked-heading" class="flex shrink-0 items-baseline gap-2 text-sm font-semibold text-highlighted">
						Unranked
						<span class="font-normal text-muted tabular-nums">
							{{ unrankedTier.length }}
							<span class="sr-only">anime</span>
						</span>
					</h2>
					<div
						data-unranked-scroll
						class="mt-2 min-h-14 w-full shrink overflow-y-auto border border-dashed border-default"
						:class="rowCornerClass">
						<DraggableTier v-model="unrankedTier" lane-id="unranked" compact>
							<template #empty>
								<div
									data-tier-empty
									class="col-span-full flex flex-wrap items-center gap-x-3 gap-y-2 px-2 py-1 text-sm text-muted">
									<span class="min-w-0 flex-1 basis-48">
										Nothing is waiting to be ranked. Anime you add or drop here land in this tray.
									</span>
									<!-- The onboarding alert already offers both actions on an empty tier list. -->
									<span v-if="tierlistStore.entryCount > 0" class="flex flex-wrap gap-2">
										<UButton
											v-for="action in emptyActions"
											:key="action.label"
											:icon="action.icon"
											:label="action.label"
											color="neutral"
											variant="subtle"
											class="rounded-full"
											@click="action.onClick" />
									</span>
								</div>
							</template>
						</DraggableTier>
					</div>
				</section>
			</div>
			</div>
		</UContainer>
		<AnimesImportModal v-model:open="openImport" />
		<UModal
			v-model:open="importConfirmOpen"
			title="Replace the current tier list?"
			:description="`The ${tierlistStore.entryCount} anime you have placed are replaced by the contents of this file, and this can't be undone.`">
			<template #footer>
				<UButton
					label="Keep my tier list"
					color="neutral"
					variant="outline"
					class="ms-auto rounded-full"
					@click="cancelImport" />
				<UButton label="Replace tier list" color="error" class="rounded-full" @click="confirmImport" />
			</template>
		</UModal>
		<InspectorOverlay />
		<InspectorCursorTooltip />
		<InspectorPopup />
	</UDashboardPanel>
</template>

<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui"
import { VueDraggable } from "vue-draggable-plus"
import { FEATURE_REGISTRY } from "#shared/config/features"
import type { AniListMediaListSummary } from "~~/shared/types/anilist"
import type { TierlistExportDocument } from "~/types/tierlist"
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
	if (import.meta.server) return
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
		icon: "i-lucide-cloud-download",
		label: "Import from AniList",
		size: "md" as const,
		class: "rounded-full",
		onClick: () => {
			openImport.value = true
		}
	},
	{
		icon: "i-lucide-search",
		label: "Search anime",
		size: "md" as const,
		class: "rounded-full",
		color: "neutral" as const,
		variant: "subtle" as const,
		onClick: () => {
			openSearch.value = true
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

const lastAddedMediaId = ref<number | null>(null)

function addAnime(media: AniListMediaListSummary): void {
	// The picker stays open and confirms a successful add in place; only a failure needs a toast.
	if (tierlistStore.addAnimeMedia(media)) {
		lastAddedMediaId.value = media.id
		return
	}
	toast.add({
		title: "Anime not added",
		description: "It is already in this tier list, or the tier list is full.",
		color: "warning"
	})
}

/** When the picker closes after an add, land on the new card instead of back on the trigger. */
function revealLastAdded(event: Event): void {
	const mediaId = lastAddedMediaId.value
	lastAddedMediaId.value = null
	if (mediaId === null) return
	const card = document.querySelector<HTMLElement>(`[data-tier-entry][data-media-id="${mediaId}"]`)
	if (!card) return
	event.preventDefault()
	card.scrollIntoView({ block: "nearest" })
	card.focus({ preventScroll: true })
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

const importConfirmOpen = ref(false)
const pendingImport = ref<TierlistExportDocument | null>(null)

function confirmImport(): void {
	const snapshot = pendingImport.value
	importConfirmOpen.value = false
	pendingImport.value = null
	if (!snapshot) return

	tierlistStore.applySnapshot(snapshot)
	toast.add({ title: "Tier list imported", color: "success" })
}

function cancelImport(): void {
	importConfirmOpen.value = false
	pendingImport.value = null
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
		if (tierlistStore.entryCount > 0) {
			pendingImport.value = parsed.data
			importConfirmOpen.value = true
			return
		}
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

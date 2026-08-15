<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import CreateCanvasPreview from "~/components/create/CanvasPreview.vue"
import CreateGraduatedSlider from "~/components/create/GraduatedSlider.vue"
import type {
	AniListMediaSummary
} from "~~/shared/types/anilist"
import type {
	CreateContentId,
	CreateExportFormat,
	CreateFontId,
	CreateImageSource,
	CreatePreset,
	CreatePresetId,
	CreateTitleLanguage
} from "~/utils/create-artwork"
import {
	CREATE_CONTENT_OPTIONS,
	CREATE_EXPORT_FORMATS,
	CREATE_FONTS,
	CREATE_FONT_IDS,
	CREATE_IMAGE_SOURCE_OPTIONS,
	CREATE_PRESETS,
	CREATE_PRESET_IDS,
	CREATE_TITLE_LANGUAGE_OPTIONS,
	getCreateFont,
	getCreateMediaImage,
	getCreateMediaTitle,
	getCreatePreset,
	selectCreateContentEntries
} from "~/utils/create-artwork"
import type { CreateArtworkOptions } from "~/utils/create-canvas.client"

definePageMeta({
	feature: "create",
	auth: FEATURE_REGISTRY.create.access,
	indexable: FEATURE_REGISTRY.create.indexable
})

interface PreviewApi {
	download: (
		format: CreateExportFormat,
		title: string,
		preset: CreatePreset
	) => Promise<void>
}

const toast = useToast()
const entriesStore = useEntriesStore()
const userStore = useUserStore()
const { getAllAnimes } = storeToRefs(entriesStore)
const preview = ref<PreviewApi | null>(null)
const selectedPresetId = ref<CreatePresetId>("story")
const contentMode = ref<CreateContentId>("anime")
const titleLanguage = ref<CreateTitleLanguage>("userPreferred")
const imageSource = ref<CreateImageSource>("cover")
const fontId = ref<CreateFontId>("sans")
const title = ref("")
const subtitle = ref("Created with AniTools")
const accentColor = ref("#8b5cf6")
const backgroundColor = ref("#111827")
const overlayOpacity = ref(72)
const imageZoom = ref(1)
const imagePositionX = ref(0.5)
const imagePositionY = ref(0.5)
const titleScale = ref(1)
const subtitleScale = ref(1)
const exportFormat = ref<CreateExportFormat>("png")
const selectedAnime = ref<AniListMediaSummary | null>(null)
const animeSearchOpen = ref(false)
const animeError = ref<string | null>(null)
const exporting = ref(false)
const preset = computed(() => getCreatePreset(selectedPresetId.value))
const presetItems = CREATE_PRESET_IDS.map(id => CREATE_PRESETS[id])
const fontItems = CREATE_FONT_IDS.map(id => ({
	label: CREATE_FONTS[id].label,
	value: id
}))
const exportItems = CREATE_EXPORT_FORMATS.map(value => ({
	label: value === "jpeg" ? "JPEG" : value.toLocaleUpperCase("en"),
	value
}))
const contentItems = computed(() => CREATE_CONTENT_OPTIONS.map(option => ({
	label: option.label,
	value: option.id,
	icon: option.icon,
	disabled: option.id !== "anime"
		&& selectCreateContentEntries(getAllAnimes.value, option.id).length === 0
})))
const selectedContentOption = computed(() =>
	CREATE_CONTENT_OPTIONS.find(option => option.id === contentMode.value)
	?? CREATE_CONTENT_OPTIONS[0]
)
const selectedAnimeTitle = computed(() => {
	const media = selectedAnime.value
	return media ? getCreateMediaTitle(media, titleLanguage.value) : null
})
const selectedAnimeCover = computed(() => selectedAnime.value?.coverImage?.extraLarge
	?? selectedAnime.value?.coverImage?.large
	?? selectedAnime.value?.coverImage?.medium
	?? null
)
const hasBanner = computed(() => Boolean(selectedAnime.value?.bannerImage))
const imageSourceItems = computed(() => CREATE_IMAGE_SOURCE_OPTIONS.map(item => ({
	...item,
	disabled: item.value === "banner" && !hasBanner.value
})))
const backgroundImageUrl = computed(() => {
	const media = selectedAnime.value
	if (!media) return null
	return getCreateMediaImage(media, imageSource.value)
		?? getCreateMediaImage(media, "cover")
})
const contentCandidates = computed(() => contentMode.value === "anime"
	? getAllAnimes.value.flatMap(entry => entry.media ? [entry.media] : [])
	: selectCreateContentEntries(getAllAnimes.value, contentMode.value, 10)
		.flatMap(entry => entry.media ? [entry.media] : [])
)
const artworkOptions = computed<CreateArtworkOptions>(() => ({
	preset: preset.value,
	title: title.value.trim().slice(0, 100),
	subtitle: subtitle.value.trim().slice(0, 160),
	accentColor: accentColor.value,
	backgroundColor: backgroundColor.value,
	overlayOpacity: overlayOpacity.value,
	imageZoom: imageZoom.value,
	imagePositionX: imagePositionX.value,
	imagePositionY: imagePositionY.value,
	fontFamily: getCreateFont(fontId.value).family,
	titleScale: titleScale.value,
	subtitleScale: subtitleScale.value
}))

function applySelectedAnime(media: AniListMediaSummary, automaticSubtitle?: string) {
	selectedAnime.value = media
	if (imageSource.value === "banner" && !media.bannerImage) {
		imageSource.value = "cover"
	}
	title.value = getCreateMediaTitle(media, titleLanguage.value)
	if (automaticSubtitle !== undefined) subtitle.value = automaticSubtitle
}

watch(titleLanguage, () => {
	if (selectedAnime.value) {
		title.value = getCreateMediaTitle(selectedAnime.value, titleLanguage.value)
	}
})

watch([contentMode, getAllAnimes], ([mode]) => {
	if (mode === "anime") return
	const entry = selectCreateContentEntries(getAllAnimes.value, mode, 10)[0]
	if (!entry?.media) return
	applySelectedAnime(entry.media, selectedContentOption.value.subtitle)
})

watch(() => userStore.isAuthenticated, async (authenticated) => {
	if (!authenticated || entriesStore.isInitialized) return
	try {
		await entriesStore.fetchAllAnimes()
	} catch {
		toast.add({
			title: "Automatic content unavailable",
			description: "Your AniList entries could not be loaded. Anime search is still available.",
			color: "warning",
			icon: "i-lucide-triangle-alert"
		})
	}
}, { immediate: true })

function selectAnime(media: AniListMediaSummary) {
	animeError.value = null
	const image = media.coverImage?.extraLarge
		?? media.coverImage?.large
		?? media.coverImage?.medium
		?? media.bannerImage

	if (!image) {
		animeError.value = "This anime does not have an image available on AniList."
		return
	}

	applySelectedAnime(
		media,
		contentMode.value === "anime"
			? CREATE_CONTENT_OPTIONS[0].subtitle
			: selectedContentOption.value.subtitle
	)
	animeSearchOpen.value = false
}

async function download() {
	if (!preview.value) return
	exporting.value = true

	try {
		await preview.value.download(exportFormat.value, title.value, preset.value)
		toast.add({
			title: "Artwork exported",
			description: `${preset.value.width} × ${preset.value.height} ${exportFormat.value.toLocaleUpperCase("en")}`,
			icon: "i-lucide-download"
		})
	} catch (caughtError) {
		toast.add({
			title: "Export failed",
			description: caughtError instanceof Error
				? caughtError.message
				: "The browser could not export this artwork.",
			color: "error",
			icon: "i-lucide-circle-alert"
		})
	} finally {
		exporting.value = false
	}
}

useSeoMeta({
	title: "Create anime artwork",
	description: "Create and export anime stories, square posts, AniList thumbnails and banners locally in your browser.",
	robots: "noindex, nofollow"
})
</script>

<template>
	<UDashboardPanel
		id="create"
		class="xl:h-dvh xl:min-h-0 xl:overflow-hidden"
		:ui="{ body: 'p-2 pt-2 sm:p-3 sm:pt-3 xl:min-h-0 xl:overflow-hidden' }">
		<template #body>
			<UContainer class="h-full max-w-none px-0 sm:px-0 lg:px-0">
				<div class="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(34rem,0.9fr)_minmax(0,1.1fr)]">
					<aside class="grid gap-3 xl:grid-cols-2 xl:content-start">
						<UPageCard
							title="Format"
							description="Exact export dimensions."
							class="xl:col-span-2"
							:ui="{ container: 'gap-y-2 p-3 sm:p-3' }">
							<div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
								<UButton
									v-for="item in presetItems"
									:key="item.id"
									:icon="item.icon"
									:label="item.label"
									:color="selectedPresetId === item.id ? 'primary' : 'neutral'"
									:variant="selectedPresetId === item.id ? 'soft' : 'ghost'"
									:aria-pressed="selectedPresetId === item.id"
									class="justify-start px-2"
									@click="selectedPresetId = item.id" />
							</div>
							<p class="mt-1 text-xs text-muted">
								{{ preset.width }} × {{ preset.height }} px · {{ preset.description }}
							</p>
						</UPageCard>

						<UPageCard title="Content" :ui="{ container: 'gap-y-2 p-3 sm:p-3' }">
							<div class="space-y-2">
								<UFormField label="Content">
									<USelect
										v-model="contentMode"
										:items="contentItems"
										value-key="value"
										class="w-full"
										aria-label="Artwork content" />
								</UFormField>
								<UFormField label="Anime">
									<UModal
										v-model:open="animeSearchOpen"
										:ui="{ content: 'sm:max-w-4xl' }">
										<UButton
											:label="selectedAnimeTitle || (contentMode === 'anime' ? 'Select anime...' : 'Choose from the top 10...')"
											icon="i-lucide-search"
											color="neutral"
											variant="outline"
											block
											class="justify-start" />
										<template #content>
											<AnimePicker
												:suggestions="contentCandidates"
												:searchable="contentMode === 'anime'"
												action-label="Use"
												:empty-label="contentMode === 'anime'
													? 'Search AniList or load a profile to see anime here.'
													: 'No matching anime is available in this AniList profile.'"
												@select="selectAnime" />
										</template>
									</UModal>
								</UFormField>
								<p
									v-if="!userStore.isAuthenticated"
									class="text-[11px] leading-tight text-muted">
									Load an AniList profile to unlock automatic Statistics selections.
								</p>
								<div class="grid grid-cols-2 gap-2">
									<UFormField label="Title language">
										<USelect
											v-model="titleLanguage"
											:items="CREATE_TITLE_LANGUAGE_OPTIONS"
											value-key="value"
											class="w-full"
											aria-label="Anime title language" />
									</UFormField>
									<UFormField label="Artwork source">
										<USelect
											v-model="imageSource"
											:items="imageSourceItems"
											value-key="value"
											class="w-full"
											aria-label="Anime artwork source" />
									</UFormField>
								</div>
								<div
									v-if="selectedAnime && (backgroundImageUrl || selectedAnimeCover)"
									class="flex items-center gap-2 rounded-lg bg-elevated/60 p-2">
									<NuxtImg
										:src="backgroundImageUrl || selectedAnimeCover"
										:alt="selectedAnimeTitle || 'Selected anime cover'"
										class="h-14 w-10 shrink-0 rounded-md object-cover" />
									<div class="min-w-0">
										<p class="line-clamp-2 text-sm font-medium text-highlighted">
											{{ selectedAnimeTitle }}
										</p>
										<p class="mt-1 text-xs text-muted">
											{{ imageSource === "banner" ? "AniList banner" : "AniList cover" }} selected
										</p>
									</div>
								</div>
								<UAlert
									v-if="animeError"
									color="error"
									variant="soft"
									:title="animeError" />
								<UFormField label="Title">
									<UInput
										v-model="title"
										maxlength="100"
										class="w-full"
										placeholder="Artwork title" />
								</UFormField>
								<UFormField label="Subtitle">
									<UInput
										v-model="subtitle"
										maxlength="160"
										class="w-full"
										placeholder="Optional subtitle" />
								</UFormField>
							</div>
						</UPageCard>

						<UPageCard title="Style" :ui="{ container: 'gap-y-2 p-3 sm:p-3' }">
							<div class="space-y-2.5">
								<UFormField label="Font">
									<USelect
										v-model="fontId"
										:items="fontItems"
										value-key="value"
										class="w-full"
										aria-label="Artwork font" />
								</UFormField>
								<div class="grid grid-cols-2 gap-3">
									<UFormField label="Accent">
										<input
											v-model="accentColor"
											type="color"
											class="h-10 w-full cursor-pointer rounded-md border border-default bg-default p-1">
									</UFormField>
									<UFormField label="Background">
										<input
											v-model="backgroundColor"
											type="color"
											class="h-10 w-full cursor-pointer rounded-md border border-default bg-default p-1">
									</UFormField>
								</div>
								<CreateGraduatedSlider
									v-model="overlayOpacity"
									label="Overlay"
									:min="0"
									:max="95"
									:step="1"
									unit="%" />
								<CreateGraduatedSlider
									v-model="titleScale"
									label="Title size"
									:min="0.6"
									:max="1.6"
									:step="0.05"
									:decimals="2"
									unit="×" />
								<CreateGraduatedSlider
									v-model="subtitleScale"
									label="Subtitle size"
									:min="0.6"
									:max="1.6"
									:step="0.05"
									:decimals="2"
									unit="×" />
								<template v-if="backgroundImageUrl">
									<CreateGraduatedSlider
										v-model="imageZoom"
										label="Image zoom"
										:min="1"
										:max="3"
										:step="0.05"
										:decimals="2"
										unit="×" />
									<div class="grid grid-cols-2 gap-3">
										<CreateGraduatedSlider
											v-model="imagePositionX"
											label="Horizontal focus"
											:min="0"
											:max="1"
											:step="0.01"
											display="percent" />
										<CreateGraduatedSlider
											v-model="imagePositionY"
											label="Vertical focus"
											:min="0"
											:max="1"
											:step="0.01"
											display="percent" />
									</div>
								</template>
							</div>
						</UPageCard>
					</aside>

					<section aria-label="Artwork preview" class="min-h-0 min-w-0 xl:h-full">
						<ClientOnly>
							<CreateCanvasPreview
								ref="preview"
								:options="artworkOptions"
								:background-image-url="backgroundImageUrl">
								<template #actions>
									<div class="flex items-center gap-2 rounded-lg bg-default/90 p-2 shadow-lg ring ring-default backdrop-blur">
										<USelect
											v-model="exportFormat"
											:items="exportItems"
											value-key="value"
											class="w-24"
											aria-label="Export format" />
										<UButton
											label="Export"
											icon="i-lucide-download"
											class="justify-center"
											:loading="exporting"
											@click="download" />
									</div>
								</template>
							</CreateCanvasPreview>
							<template #fallback>
								<WidgetLoadingSkeleton
									label="Preparing artwork preview"
									class="min-h-96" />
							</template>
						</ClientOnly>

					</section>
				</div>
			</UContainer>
		</template>
	</UDashboardPanel>
</template>

<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import type {
	CreateExportFormat,
	CreatePreset,
	CreatePresetId
} from "~/utils/create-artwork"
import {
	CREATE_EXPORT_FORMATS,
	CREATE_PRESETS,
	CREATE_PRESET_IDS,
	getCreatePreset
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

const MAX_BACKGROUND_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_BACKGROUND_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp"
])
const toast = useToast()
const preview = ref<PreviewApi | null>(null)
const selectedPresetId = ref<CreatePresetId>("story")
const title = ref("My anime story")
const subtitle = ref("Created with AniTools")
const accentColor = ref("#8b5cf6")
const backgroundColor = ref("#111827")
const overlayOpacity = ref(72)
const imageZoom = ref(1)
const imagePositionX = ref(0.5)
const imagePositionY = ref(0.5)
const transparentBadge = ref(true)
const exportFormat = ref<CreateExportFormat>("png")
const backgroundImageUrl = ref<string | null>(null)
const backgroundFileName = ref<string | null>(null)
const fileError = ref<string | null>(null)
const exporting = ref(false)
const preset = computed(() => getCreatePreset(selectedPresetId.value))
const presetItems = CREATE_PRESET_IDS.map(id => CREATE_PRESETS[id])
const exportItems = CREATE_EXPORT_FORMATS.map(value => ({
	label: value === "jpeg" ? "JPEG" : value.toLocaleUpperCase("en"),
	value
}))
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
	transparentBadge: transparentBadge.value
}))

function releaseBackgroundUrl() {
	if (backgroundImageUrl.value) URL.revokeObjectURL(backgroundImageUrl.value)
	backgroundImageUrl.value = null
	backgroundFileName.value = null
}

function handleBackgroundFile(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	fileError.value = null

	if (!file) return
	if (!ALLOWED_BACKGROUND_TYPES.has(file.type)) {
		fileError.value = "Choose a PNG, JPEG or WebP image."
		input.value = ""
		return
	}
	if (file.size > MAX_BACKGROUND_FILE_SIZE) {
		fileError.value = "The image must be 20 MB or smaller."
		input.value = ""
		return
	}

	releaseBackgroundUrl()
	backgroundImageUrl.value = URL.createObjectURL(file)
	backgroundFileName.value = file.name
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

onBeforeUnmount(releaseBackgroundUrl)

useSeoMeta({
	title: "Create anime artwork",
	description: "Create and export anime stories, square posts, badges, thumbnails and banners locally in your browser.",
	robots: "noindex, nofollow"
})
</script>

<template>
	<UDashboardPanel id="create">
		<template #body>
			<UContainer class="py-8 sm:py-12">
				<header class="mb-8">
					<p class="mb-2 text-sm font-semibold text-primary">
						Local artwork studio
					</p>
					<h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
						Create
					</h1>
					<p class="mt-2 max-w-2xl text-sm text-muted">
						Design stories, posts, badges, AniList thumbnails and banners. Your source image stays in this browser.
					</p>
				</header>

				<div class="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
					<aside class="space-y-5">
						<UPageCard title="Format" description="Exports use the exact dimensions shown.">
							<div class="grid grid-cols-2 gap-2">
								<UButton
									v-for="item in presetItems"
									:key="item.id"
									:icon="item.icon"
									:label="item.label"
									:color="selectedPresetId === item.id ? 'primary' : 'neutral'"
									:variant="selectedPresetId === item.id ? 'soft' : 'ghost'"
									:aria-pressed="selectedPresetId === item.id"
									class="justify-start"
									@click="selectedPresetId = item.id" />
							</div>
							<p class="mt-3 text-xs text-muted">
								{{ preset.width }} × {{ preset.height }} px · {{ preset.description }}
							</p>
						</UPageCard>

						<UPageCard title="Content">
							<div class="space-y-4">
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
								<UFormField
									label="Background image"
									:description="backgroundFileName || 'PNG, JPEG or WebP · 20 MB max'">
									<input
										type="file"
										accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
										class="block w-full cursor-pointer rounded-md border border-default bg-default px-3 py-2 text-sm text-muted file:mr-3 file:cursor-pointer file:border-0 file:bg-transparent file:font-medium file:text-highlighted"
										@change="handleBackgroundFile">
								</UFormField>
								<UAlert
									v-if="fileError"
									color="error"
									variant="soft"
									:title="fileError" />
								<UButton
									v-if="backgroundImageUrl"
									label="Remove image"
									icon="i-lucide-trash-2"
									color="neutral"
									variant="soft"
									size="sm"
									@click="releaseBackgroundUrl" />
							</div>
						</UPageCard>

						<UPageCard title="Style">
							<div class="space-y-5">
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
								<UFormField :label="`Overlay · ${overlayOpacity}%`">
									<USlider v-model="overlayOpacity" :min="0" :max="95" :step="1" />
								</UFormField>
								<template v-if="backgroundImageUrl">
									<UFormField :label="`Image zoom · ${imageZoom.toFixed(2)}×`">
										<USlider v-model="imageZoom" :min="1" :max="3" :step="0.05" />
									</UFormField>
									<UFormField label="Horizontal focus">
										<USlider v-model="imagePositionX" :min="0" :max="1" :step="0.01" />
									</UFormField>
									<UFormField label="Vertical focus">
										<USlider v-model="imagePositionY" :min="0" :max="1" :step="0.01" />
									</UFormField>
								</template>
								<div
									v-if="selectedPresetId === 'badge'"
									class="flex items-center justify-between gap-4">
									<div>
										<p class="text-sm font-medium text-highlighted">
											Transparent outside
										</p>
										<p class="text-xs text-muted">
											Best with PNG or WebP
										</p>
									</div>
									<USwitch v-model="transparentBadge" aria-label="Transparent badge background" />
								</div>
							</div>
						</UPageCard>

						<UPageCard title="Export">
							<div class="flex gap-2">
								<USelect
									v-model="exportFormat"
									:items="exportItems"
									value-key="value"
									class="w-28"
									aria-label="Export format" />
								<UButton
									label="Download"
									icon="i-lucide-download"
									class="flex-1 justify-center"
									:loading="exporting"
									@click="download" />
							</div>
						</UPageCard>
					</aside>

					<section aria-label="Artwork preview" class="min-w-0">
						<ClientOnly>
							<CreateCanvasPreview
								ref="preview"
								:options="artworkOptions"
								:background-image-url="backgroundImageUrl" />
							<template #fallback>
								<USkeleton class="min-h-96 rounded-xl" />
							</template>
						</ClientOnly>

						<UAlert
							class="mt-4"
							color="neutral"
							variant="subtle"
							icon="i-lucide-shield-check"
							title="Rights and privacy"
							description="Only use images you own or are licensed to reuse. Imported files and rendering remain local; AniTools does not upload them or claim rights to your export." />
					</section>
				</div>
			</UContainer>
		</template>
	</UDashboardPanel>
</template>

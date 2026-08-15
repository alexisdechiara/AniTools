<script setup lang="ts">
import type {
	CreateExportFormat,
	CreatePreset
} from "~/utils/create-artwork"
import {
	exportCreateArtwork,
	renderCreateArtwork,
	type CreateArtworkOptions
} from "~/utils/create-canvas.client"

const props = defineProps<{
	options: CreateArtworkOptions
	backgroundImageUrl: string | null
}>()
const canvas = useTemplateRef<HTMLCanvasElement>("canvas")
const rendering = ref(false)
const renderError = ref<string | null>(null)
let loadedImage: HTMLImageElement | null = null
let loadedImageUrl: string | null = null
let renderSequence = 0

async function getBackgroundImage(url: string | null): Promise<HTMLImageElement | null> {
	if (!url) {
		loadedImage = null
		loadedImageUrl = null
		return null
	}
	if (loadedImage && loadedImageUrl === url) return loadedImage

	const image = new Image()
	image.crossOrigin = "anonymous"
	image.decoding = "async"
	const result = await new Promise<HTMLImageElement>((resolve, reject) => {
		image.addEventListener("load", () => resolve(image), { once: true })
		image.addEventListener("error", () => reject(
			new Error("The selected image could not be decoded.")
		), { once: true })
		image.src = url
	})
	await result.decode().catch(() => undefined)
	loadedImage = result
	loadedImageUrl = url
	return result
}

async function render() {
	const target = canvas.value
	if (!target) return

	const sequence = ++renderSequence
	rendering.value = true
	renderError.value = null

	try {
		const image = await getBackgroundImage(props.backgroundImageUrl)
		if (sequence !== renderSequence) return
		renderCreateArtwork(target, props.options, image)
	} catch (caughtError) {
		if (sequence !== renderSequence) return
		renderError.value = caughtError instanceof Error
			? caughtError.message
			: "Unable to render this artwork."
		renderCreateArtwork(target, props.options, null)
	} finally {
		if (sequence === renderSequence) rendering.value = false
	}
}

async function download(
	format: CreateExportFormat,
	title: string,
	preset: CreatePreset
) {
	if (!canvas.value) throw new Error("The preview is not ready.")
	await render()
	await exportCreateArtwork(canvas.value, format, title, preset.id)
}

watch(
	() => [props.options, props.backgroundImageUrl],
	() => void render(),
	{ deep: true }
)

onMounted(() => void render())

defineExpose({ download, render })
</script>

<template>
	<div class="relative flex size-full min-h-80 items-center justify-center overflow-hidden rounded-xl bg-elevated p-2 sm:p-3">
		<canvas
			ref="canvas"
			class="max-h-full max-w-full rounded-md shadow-2xl"
			:style="{ aspectRatio: `${options.preset.width} / ${options.preset.height}` }"
			role="img"
			:aria-label="`Preview of ${options.preset.label} artwork`" />
		<div
			v-if="rendering"
			class="absolute inset-0 flex items-center justify-center bg-default/50"
			aria-live="polite">
			<Icon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
		</div>
		<UAlert
			v-if="renderError"
			class="absolute inset-x-4 top-4"
			color="error"
			variant="solid"
			:title="renderError" />
		<div class="absolute right-3 bottom-3 z-10">
			<slot name="actions" />
		</div>
	</div>
</template>

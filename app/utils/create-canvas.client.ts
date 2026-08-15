import type {
	CreateExportFormat,
	CreatePreset
} from "~/utils/create-artwork"
import {
	calculateCoverCrop,
	getCreateExportFilename,
	getCreateMimeType,
	wrapCreateText
} from "~/utils/create-artwork"

export interface CreateArtworkOptions {
	preset: CreatePreset
	title: string
	subtitle: string
	accentColor: string
	backgroundColor: string
	overlayOpacity: number
	imageZoom: number
	imagePositionX: number
	imagePositionY: number
	fontFamily: string
	titleScale: number
	subtitleScale: number
}

function drawCoverImage(
	context: CanvasRenderingContext2D,
	image: HTMLImageElement,
	options: CreateArtworkOptions
) {
	const { width, height } = options.preset
	const crop = calculateCoverCrop(
		image.naturalWidth,
		image.naturalHeight,
		width,
		height,
		options.imageZoom,
		options.imagePositionX,
		options.imagePositionY
	)

	context.drawImage(
		image,
		crop.sourceX,
		crop.sourceY,
		crop.sourceWidth,
		crop.sourceHeight,
		0,
		0,
		width,
		height
	)
}

function drawBackdrop(
	context: CanvasRenderingContext2D,
	options: CreateArtworkOptions,
	image: HTMLImageElement | null
) {
	const { width, height } = options.preset

	context.fillStyle = options.backgroundColor
	context.fillRect(0, 0, width, height)

	if (image) drawCoverImage(context, image, options)

	const gradient = context.createLinearGradient(0, 0, width, height)
	gradient.addColorStop(0, `${options.accentColor}cc`)
	gradient.addColorStop(0.48, `${options.backgroundColor}33`)
	gradient.addColorStop(1, `${options.backgroundColor}f2`)
	context.fillStyle = gradient
	context.globalAlpha = Math.min(0.95, Math.max(0, options.overlayOpacity / 100))
	context.fillRect(0, 0, width, height)
	context.globalAlpha = 1

	context.fillStyle = options.accentColor
	context.globalAlpha = 0.22
	context.beginPath()
	context.arc(width * 0.9, height * 0.12, Math.min(width, height) * 0.28, 0, Math.PI * 2)
	context.fill()
	context.globalAlpha = 1
}

function drawText(
	context: CanvasRenderingContext2D,
	options: CreateArtworkOptions
) {
	const { width, height, id } = options.preset
	const isWide = id === "banner"
	const padding = Math.max(48, Math.min(width, height) * 0.075)
	const baseTitleSize = Math.round(
		Math.min(width * (isWide ? 0.07 : 0.105), height * 0.15)
	)
	const titleSize = Math.max(20, Math.round(baseTitleSize * options.titleScale))
	const subtitleSize = Math.max(
		16,
		Math.round(baseTitleSize * 0.34 * options.subtitleScale)
	)
	const maxWidth = width - padding * 2
	const baseline = height - padding

	context.textAlign = "left"
	context.textBaseline = "alphabetic"
	context.fillStyle = "#ffffff"
	context.shadowColor = "rgba(0, 0, 0, 0.45)"
	context.shadowBlur = Math.max(8, titleSize * 0.18)
	context.shadowOffsetY = Math.max(3, titleSize * 0.06)
	context.font = `800 ${titleSize}px ${options.fontFamily}`

	const titleLines = wrapCreateText(
		options.title || "AniTools",
		maxWidth,
		value => context.measureText(value).width,
		isWide ? 2 : 4
	)
	const lineHeight = titleSize * 1.04
	const titleHeight = titleLines.length * lineHeight
	const subtitleGap = options.subtitle ? subtitleSize * 1.5 : 0
	const startY = baseline - titleHeight - subtitleGap
	const x = padding

	titleLines.forEach((line, index) => {
		context.fillText(line, x, startY + (index + 1) * lineHeight, maxWidth)
	})

	if (options.subtitle) {
		context.font = `600 ${subtitleSize}px ${options.fontFamily}`
		context.fillStyle = "#f3f4f6"
		context.fillText(options.subtitle, x, baseline, maxWidth)
	}

	context.shadowColor = "transparent"
	context.fillStyle = options.accentColor
	const accentWidth = Math.min(width * 0.18, 180)
	const accentX = padding
	context.fillRect(accentX, startY - titleSize * 0.38, accentWidth, Math.max(5, titleSize * 0.08))
}

export function renderCreateArtwork(
	canvas: HTMLCanvasElement,
	options: CreateArtworkOptions,
	image: HTMLImageElement | null
) {
	const context = canvas.getContext("2d")
	if (!context) throw new Error("Canvas rendering is unavailable in this browser.")

	canvas.width = options.preset.width
	canvas.height = options.preset.height
	context.clearRect(0, 0, canvas.width, canvas.height)
	drawBackdrop(context, options, image)
	drawText(context, options)
}

export function exportCreateArtwork(
	canvas: HTMLCanvasElement,
	format: CreateExportFormat,
	title: string,
	presetId: CreatePreset["id"]
): Promise<void> {
	return new Promise((resolve, reject) => {
		const exportCanvas = document.createElement("canvas")
		exportCanvas.width = canvas.width
		exportCanvas.height = canvas.height
		const context = exportCanvas.getContext("2d")

		if (!context) {
			reject(new Error("Canvas export is unavailable in this browser."))
			return
		}

		if (format === "jpeg") {
			context.fillStyle = "#ffffff"
			context.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
		}
		context.drawImage(canvas, 0, 0)

		exportCanvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error("The browser could not encode this artwork."))
				return
			}
			const expectedMimeType = getCreateMimeType(format)
			if (blob.type && blob.type !== expectedMimeType) {
				reject(new Error(
					`${format.toLocaleUpperCase("en")} export is not supported by this browser.`
				))
				return
			}

			const url = URL.createObjectURL(blob)
			const anchor = document.createElement("a")
			anchor.href = url
			anchor.download = getCreateExportFilename(title, presetId, format)
			document.body.append(anchor)
			anchor.click()
			anchor.remove()
			window.setTimeout(() => URL.revokeObjectURL(url), 0)
			resolve()
		}, getCreateMimeType(format), format === "png" ? undefined : 0.92)
	})
}

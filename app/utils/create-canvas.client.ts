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
import type { CreateStatTile } from "~/utils/create-stats"

interface CreateArtworkBase {
	preset: CreatePreset
	accentColor: string
	backgroundColor: string
	fontFamily: string
}

export interface CreateAnimeArtworkOptions extends CreateArtworkBase {
	templateId: "anime"
	title: string
	subtitle: string
	overlayOpacity: number
	imageZoom: number
	imagePositionX: number
	imagePositionY: number
	titleScale: number
	subtitleScale: number
	scoreLabel: string | null
	note: string
	genres: readonly string[]
}

export interface CreateStatsArtworkOptions extends CreateArtworkBase {
	templateId: "stats"
	heading: string
	tiles: readonly CreateStatTile[]
	footnote: string
}

export type CreateArtworkOptions = CreateAnimeArtworkOptions | CreateStatsArtworkOptions

function drawCoverImage(
	context: CanvasRenderingContext2D,
	image: HTMLImageElement,
	options: CreateAnimeArtworkOptions
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

function drawRoundedRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
) {
	context.beginPath()
	context.roundRect(x, y, width, height, radius)
}

function drawBackdrop(
	context: CanvasRenderingContext2D,
	options: CreateAnimeArtworkOptions,
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

function drawScoreBadge(
	context: CanvasRenderingContext2D,
	options: CreateAnimeArtworkOptions
) {
	if (!options.scoreLabel) return

	const { width, height } = options.preset
	const padding = Math.max(48, Math.min(width, height) * 0.075)
	const fontSize = Math.max(18, Math.round(Math.min(width, height) * 0.045))

	context.font = `800 ${fontSize}px ${options.fontFamily}`
	const textWidth = context.measureText(options.scoreLabel).width
	const badgeHeight = fontSize * 2
	const badgeWidth = Math.max(badgeHeight, textWidth + fontSize * 1.6)
	const x = width - padding - badgeWidth
	const y = padding

	context.shadowColor = "rgba(0, 0, 0, 0.35)"
	context.shadowBlur = fontSize * 0.4
	context.shadowOffsetY = fontSize * 0.1
	context.fillStyle = options.accentColor
	drawRoundedRect(context, x, y, badgeWidth, badgeHeight, badgeHeight / 2)
	context.fill()
	context.shadowColor = "transparent"

	context.fillStyle = "#ffffff"
	context.textAlign = "center"
	context.textBaseline = "middle"
	context.fillText(options.scoreLabel, x + badgeWidth / 2, y + badgeHeight / 2 + fontSize * 0.04)
}

function drawGenreChips(
	context: CanvasRenderingContext2D,
	options: CreateAnimeArtworkOptions,
	titleTop: number
) {
	if (!options.genres.length) return

	const { width } = options.preset
	const padding = Math.max(48, Math.min(width, options.preset.height) * 0.075)
	const fontSize = Math.max(14, Math.round(Math.min(width, options.preset.height) * 0.024))
	const chipHeight = fontSize * 2.1
	const gap = fontSize * 0.6
	const maxWidth = width - padding * 2

	context.font = `600 ${fontSize}px ${options.fontFamily}`
	context.textAlign = "left"
	context.textBaseline = "middle"

	let x = padding
	const y = titleTop - chipHeight - fontSize * 0.7

	for (const genre of options.genres) {
		const textWidth = context.measureText(genre).width
		const chipWidth = textWidth + fontSize * 1.4
		if (x + chipWidth > padding + maxWidth) break

		context.fillStyle = "rgba(255, 255, 255, 0.16)"
		drawRoundedRect(context, x, y, chipWidth, chipHeight, chipHeight / 2)
		context.fill()

		context.fillStyle = "#ffffff"
		context.fillText(genre, x + fontSize * 0.7, y + chipHeight / 2 + fontSize * 0.03)

		x += chipWidth + gap
	}
}

function drawAnimeText(
	context: CanvasRenderingContext2D,
	options: CreateAnimeArtworkOptions
) {
	const { width, height, id } = options.preset
	const isWide = id === "banner"
	const padding = Math.max(48, Math.min(width, height) * 0.075)
	const baseTitleSize = Math.round(
		Math.min(width * (isWide ? 0.07 : 0.105), height * 0.15)
	)
	const titleSize = Math.max(20, Math.round(baseTitleSize * options.titleScale))
	const noteSize = Math.max(13, Math.round(titleSize * 0.28))
	const subtitleSize = Math.max(
		16,
		Math.round(baseTitleSize * 0.34 * options.subtitleScale)
	)
	const maxWidth = width - padding * 2
	const noteGap = options.note ? noteSize * 1.6 : 0
	const baseline = height - padding - noteGap

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

	drawGenreChips(context, options, startY - titleSize * 0.4)

	titleLines.forEach((line, index) => {
		context.fillText(line, x, startY + (index + 1) * lineHeight, maxWidth)
	})

	if (options.subtitle) {
		context.font = `600 ${subtitleSize}px ${options.fontFamily}`
		context.fillStyle = "#f3f4f6"
		context.fillText(options.subtitle, x, baseline, maxWidth)
	}

	if (options.note) {
		context.font = `italic 500 ${noteSize}px ${options.fontFamily}`
		context.fillStyle = "rgba(255, 255, 255, 0.75)"
		context.shadowBlur = Math.max(4, noteSize * 0.12)
		context.fillText(options.note, x, height - padding, maxWidth)
	}

	context.shadowColor = "transparent"
	context.fillStyle = options.accentColor
	const accentWidth = Math.min(width * 0.18, 180)
	const accentX = padding
	context.fillRect(accentX, startY - titleSize * 0.38, accentWidth, Math.max(5, titleSize * 0.08))

	drawScoreBadge(context, options)
}

function drawStatsBackdrop(
	context: CanvasRenderingContext2D,
	options: CreateStatsArtworkOptions
) {
	const { width, height } = options.preset

	const gradient = context.createLinearGradient(0, 0, width, height)
	gradient.addColorStop(0, options.backgroundColor)
	gradient.addColorStop(1, `${options.accentColor}33`)
	context.fillStyle = gradient
	context.fillRect(0, 0, width, height)

	context.fillStyle = options.accentColor
	context.globalAlpha = 0.18
	context.beginPath()
	context.arc(width * 0.08, height * 0.9, Math.min(width, height) * 0.32, 0, Math.PI * 2)
	context.fill()
	context.beginPath()
	context.arc(width * 0.94, height * 0.06, Math.min(width, height) * 0.22, 0, Math.PI * 2)
	context.fill()
	context.globalAlpha = 1
}

function drawStatsContent(
	context: CanvasRenderingContext2D,
	options: CreateStatsArtworkOptions
) {
	const { width, height } = options.preset
	const padding = Math.max(48, Math.min(width, height) * 0.075)
	const headingSize = Math.max(22, Math.round(Math.min(width, height) * 0.06))

	context.textAlign = "left"
	context.textBaseline = "alphabetic"
	context.fillStyle = "#ffffff"
	context.font = `800 ${headingSize}px ${options.fontFamily}`
	context.fillText(options.heading, padding, padding + headingSize, width - padding * 2)

	const columns = width >= height ? 2 : 1
	const rows = Math.ceil(options.tiles.length / columns)
	const gridTop = padding + headingSize * 2
	const gridBottom = height - padding - (options.footnote ? headingSize * 1.2 : 0)
	const gridHeight = Math.max(0, gridBottom - gridTop)
	const gap = Math.min(width, height) * 0.04
	const tileWidth = (width - padding * 2 - gap * (columns - 1)) / columns
	const tileHeight = Math.min(
		(gridHeight - gap * (rows - 1)) / rows,
		tileWidth * 0.72
	)
	const valueSize = Math.max(24, Math.round(tileHeight * 0.42))
	const labelSize = Math.max(12, Math.round(tileHeight * 0.14))

	options.tiles.forEach((tile, index) => {
		const column = index % columns
		const row = Math.floor(index / columns)
		const x = padding + column * (tileWidth + gap)
		const y = gridTop + row * (tileHeight + gap)

		context.fillStyle = "rgba(255, 255, 255, 0.1)"
		drawRoundedRect(context, x, y, tileWidth, tileHeight, Math.min(24, tileHeight * 0.14))
		context.fill()

		context.fillStyle = "rgba(255, 255, 255, 0.7)"
		context.font = `600 ${labelSize}px ${options.fontFamily}`
		context.textAlign = "left"
		context.textBaseline = "alphabetic"
		context.fillText(
			tile.label.toLocaleUpperCase("en"),
			x + tileWidth * 0.08,
			y + tileHeight * 0.32,
			tileWidth * 0.84
		)

		context.fillStyle = "#ffffff"
		context.font = `800 ${valueSize}px ${options.fontFamily}`
		context.fillText(tile.value, x + tileWidth * 0.08, y + tileHeight * 0.72, tileWidth * 0.84)
	})

	if (options.footnote) {
		const footnoteSize = Math.max(13, Math.round(headingSize * 0.4))
		context.font = `500 ${footnoteSize}px ${options.fontFamily}`
		context.fillStyle = "rgba(255, 255, 255, 0.65)"
		context.textAlign = "left"
		context.fillText(options.footnote, padding, height - padding, width - padding * 2)
	}
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

	if (options.templateId === "stats") {
		drawStatsBackdrop(context, options)
		drawStatsContent(context, options)
		return
	}

	drawBackdrop(context, options, image)
	drawAnimeText(context, options)
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

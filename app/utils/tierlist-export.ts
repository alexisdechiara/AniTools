import type {
	TierlistEntry,
	TierlistExportDocument,
	TierlistSnapshot,
	TierlistTier
} from "~/types/tierlist"
import {
	createTierlistExportDocument,
	getTierlistEntryTitle
} from "~/utils/tierlist-model"

export type TierlistImageFormat = "png" | "jpeg" | "webp"

export interface TierlistImageLaneLayout {
	id: string
	label: string
	color: string
	entries: TierlistEntry[]
	y: number
	height: number
}

export interface TierlistImageLayout {
	columns: number
	logicalWidth: number
	logicalHeight: number
	pixelWidth: number
	pixelHeight: number
	scale: number
	lanes: TierlistImageLaneLayout[]
}

const IMAGE_MIME_TYPES: Record<TierlistImageFormat, string> = {
	png: "image/png",
	jpeg: "image/jpeg",
	webp: "image/webp"
}

const CANVAS_MAX_WIDTH = 4096
const CANVAS_MAX_HEIGHT = 8192
const PAGE_PADDING = 32
const TITLE_HEIGHT = 72
const HEADER_WIDTH = 176
const CARD_WIDTH = 112
const CARD_HEIGHT = 160
const CARD_GAP = 8
const LANE_PADDING = 12
const LANE_GAP = 12

const colorMap: Record<string, string> = {
	"bg-transparent": "transparent",
	"bg-white": "#ffffff",
	"bg-black": "#000000",
	"bg-neutral-50": "#fafafa",
	"bg-neutral-100": "#f5f5f5",
	"bg-neutral-200": "#e5e5e5",
	"bg-neutral-300": "#d4d4d4",
	"bg-neutral-400": "#a3a3a3",
	"bg-neutral-500": "#737373",
	"bg-neutral-600": "#525252",
	"bg-neutral-700": "#404040",
	"bg-neutral-800": "#262626",
	"bg-neutral-900": "#171717",
	"bg-neutral-950": "#0a0a0a",
	"bg-red-400": "#f87171",
	"bg-orange-400": "#fb923c",
	"bg-yellow-400": "#facc15",
	"bg-green-500": "#22c55e",
	"bg-blue-400": "#60a5fa",
	"bg-indigo-400": "#818cf8",
	"bg-violet-500": "#8b5cf6"
}

function clampColumns(columns: number): number {
	return Math.min(12, Math.max(1, Math.round(columns)))
}

function resolveCanvasColor(value: string, fallback: string): string {
	if (/^#[0-9a-f]{3,8}$/i.test(value)) return value
	return colorMap[value] ?? fallback
}

function getCoverUrl(entry: TierlistEntry): string | null {
	return entry.media.coverImage?.extraLarge
		?? entry.media.coverImage?.large
		?? entry.media.coverImage?.medium
		?? null
}

function roundRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
): void {
	const boundedRadius = Math.min(radius, width / 2, height / 2)
	context.beginPath()
	context.moveTo(x + boundedRadius, y)
	context.lineTo(x + width - boundedRadius, y)
	context.quadraticCurveTo(x + width, y, x + width, y + boundedRadius)
	context.lineTo(x + width, y + height - boundedRadius)
	context.quadraticCurveTo(x + width, y + height, x + width - boundedRadius, y + height)
	context.lineTo(x + boundedRadius, y + height)
	context.quadraticCurveTo(x, y + height, x, y + height - boundedRadius)
	context.lineTo(x, y + boundedRadius)
	context.quadraticCurveTo(x, y, x + boundedRadius, y)
	context.closePath()
}

function getLaneHeight(entryCount: number, columns: number): number {
	const rowCount = Math.max(1, Math.ceil(entryCount / columns))
	return LANE_PADDING * 2 + rowCount * CARD_HEIGHT + Math.max(0, rowCount - 1) * CARD_GAP
}

export function planTierlistImageLayout(snapshot: TierlistSnapshot): TierlistImageLayout {
	const columns = clampColumns(snapshot.settings.nbCol)
	const logicalWidth = PAGE_PADDING * 2
		+ HEADER_WIDTH
		+ LANE_PADDING * 2
		+ columns * CARD_WIDTH
		+ Math.max(0, columns - 1) * CARD_GAP

	let currentY = PAGE_PADDING + TITLE_HEIGHT
	const sourceLanes: Array<Pick<TierlistImageLaneLayout, "id" | "label" | "color" | "entries">> = [
		...snapshot.tiers.map(tier => ({
			id: tier.id,
			label: tier.name,
			color: tier.color,
			entries: tier.entries
		})),
		...(snapshot.unranked.length > 0
			? [{
				id: "unranked",
				label: "Unranked",
				color: "bg-neutral-500",
				entries: snapshot.unranked
			}]
			: [])
	]

	const lanes = sourceLanes.map((lane) => {
		const height = getLaneHeight(lane.entries.length, columns)
		const result = { ...lane, y: currentY, height }
		currentY += height + LANE_GAP
		return result
	})
	const logicalHeight = Math.max(
		PAGE_PADDING * 2 + TITLE_HEIGHT + CARD_HEIGHT,
		currentY - LANE_GAP + PAGE_PADDING
	)
	const scale = Math.min(
		1,
		CANVAS_MAX_WIDTH / logicalWidth,
		CANVAS_MAX_HEIGHT / logicalHeight
	)

	return {
		columns,
		logicalWidth,
		logicalHeight,
		pixelWidth: Math.max(1, Math.floor(logicalWidth * scale)),
		pixelHeight: Math.max(1, Math.floor(logicalHeight * scale)),
		scale,
		lanes
	}
}

export function sanitizeTierlistFileStem(value: string): string {
	const sanitized = value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80)

	return sanitized || "anitools-tierlist"
}

export function buildTierlistFilename(
	format: "json" | TierlistImageFormat,
	date = new Date(),
	stem = "anitools-tierlist"
): string {
	const extension = format === "jpeg" ? "jpg" : format
	return `${sanitizeTierlistFileStem(stem)}-${date.toISOString().slice(0, 10)}.${extension}`
}

export function serializeTierlistExportDocument(document: TierlistExportDocument): string {
	return JSON.stringify(document, null, 2)
}

export function createTierlistJsonBlob(
	snapshot: TierlistSnapshot,
	exportedAt = new Date()
): Blob {
	const document = createTierlistExportDocument(snapshot, exportedAt)
	return new Blob([serializeTierlistExportDocument(document)], {
		type: "application/json;charset=utf-8"
	})
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
	return await new Promise((resolve) => {
		const image = new Image()
		const timeout = window.setTimeout(() => resolve(null), 8_000)
		image.crossOrigin = "anonymous"
		image.decoding = "async"
		image.onload = () => {
			window.clearTimeout(timeout)
			resolve(image)
		}
		image.onerror = () => {
			window.clearTimeout(timeout)
			resolve(null)
		}
		image.src = url
	})
}

async function preloadCovers(snapshot: TierlistSnapshot): Promise<Map<string, HTMLImageElement>> {
	const urls = new Set<string>()
	for (const entry of [
		...snapshot.tiers.flatMap(tier => tier.entries),
		...snapshot.unranked
	]) {
		const url = getCoverUrl(entry)
		if (url) urls.add(url)
	}

	const loadedImages = await Promise.all(
		[...urls].map(async url => [url, await loadImage(url)] as const)
	)

	return new Map(
		loadedImages.filter(
			(item): item is readonly [string, HTMLImageElement] => item[1] !== null
		)
	)
}

function drawCover(
	context: CanvasRenderingContext2D,
	entry: TierlistEntry,
	image: HTMLImageElement | undefined,
	x: number,
	y: number
): void {
	context.save()
	roundRect(context, x, y, CARD_WIDTH, CARD_HEIGHT, 8)
	context.clip()

	if (image) {
		const imageRatio = image.naturalWidth / image.naturalHeight
		const targetRatio = CARD_WIDTH / CARD_HEIGHT
		const sourceWidth = imageRatio > targetRatio
			? image.naturalHeight * targetRatio
			: image.naturalWidth
		const sourceHeight = imageRatio > targetRatio
			? image.naturalHeight
			: image.naturalWidth / targetRatio
		const sourceX = (image.naturalWidth - sourceWidth) / 2
		const sourceY = (image.naturalHeight - sourceHeight) / 2
		context.drawImage(
			image,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			x,
			y,
			CARD_WIDTH,
			CARD_HEIGHT
		)
	} else {
		context.fillStyle = resolveCanvasColor(entry.media.coverImage?.color ?? "", "#262626")
		context.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT)
	}

	const gradient = context.createLinearGradient(0, y + CARD_HEIGHT * 0.55, 0, y + CARD_HEIGHT)
	gradient.addColorStop(0, "rgba(0, 0, 0, 0)")
	gradient.addColorStop(1, "rgba(0, 0, 0, 0.82)")
	context.fillStyle = gradient
	context.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT)

	context.fillStyle = "#ffffff"
	context.font = "600 11px system-ui, sans-serif"
	context.textBaseline = "bottom"
	const title = getTierlistEntryTitle(entry)
	const shortenedTitle = title.length > 34 ? `${title.slice(0, 31)}…` : title
	context.fillText(shortenedTitle, x + 7, y + CARD_HEIGHT - 7, CARD_WIDTH - 14)
	context.restore()
}

function drawLane(
	context: CanvasRenderingContext2D,
	lane: TierlistImageLaneLayout,
	layout: TierlistImageLayout,
	background: string,
	images: Map<string, HTMLImageElement>
): void {
	const rowX = PAGE_PADDING
	const contentX = rowX + HEADER_WIDTH
	const rowWidth = layout.logicalWidth - PAGE_PADDING * 2

	context.fillStyle = resolveCanvasColor(background, "#171717")
	roundRect(context, rowX, lane.y, rowWidth, lane.height, 12)
	context.fill()

	context.fillStyle = resolveCanvasColor(lane.color, "#737373")
	roundRect(context, rowX, lane.y, HEADER_WIDTH, lane.height, 12)
	context.fill()

	context.fillStyle = "#ffffff"
	context.font = "700 20px system-ui, sans-serif"
	context.textAlign = "center"
	context.textBaseline = "middle"
	context.fillText(lane.label, rowX + HEADER_WIDTH / 2, lane.y + lane.height / 2, HEADER_WIDTH - 24)
	context.textAlign = "start"

	for (const [index, entry] of lane.entries.entries()) {
		const column = index % layout.columns
		const row = Math.floor(index / layout.columns)
		const x = contentX + LANE_PADDING + column * (CARD_WIDTH + CARD_GAP)
		const y = lane.y + LANE_PADDING + row * (CARD_HEIGHT + CARD_GAP)
		const coverUrl = getCoverUrl(entry)
		drawCover(context, entry, coverUrl ? images.get(coverUrl) : undefined, x, y)
	}
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	format: TierlistImageFormat
): Promise<Blob> {
	const expectedMimeType = IMAGE_MIME_TYPES[format]
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error(`The browser could not create a ${format.toUpperCase()} image.`))
				return
			}
			if (format === "webp" && blob.type !== expectedMimeType) {
				reject(new Error("This browser does not support WebP export."))
				return
			}
			resolve(blob)
		}, expectedMimeType, 0.92)
	})
}

export async function renderTierlistImage(
	snapshot: TierlistSnapshot,
	format: TierlistImageFormat
): Promise<Blob> {
	if (!import.meta.client) {
		throw new Error("Image export is only available in the browser.")
	}

	const layout = planTierlistImageLayout(snapshot)
	const canvas = document.createElement("canvas")
	canvas.width = layout.pixelWidth
	canvas.height = layout.pixelHeight
	const context = canvas.getContext("2d")
	if (!context) throw new Error("Canvas rendering is not supported by this browser.")

	const pageBackground = resolveCanvasColor(
		snapshot.settings.selectedBackground,
		format === "jpeg" ? "#ffffff" : "#0a0a0a"
	)
	if (pageBackground !== "transparent" || format === "jpeg") {
		context.fillStyle = pageBackground === "transparent" ? "#ffffff" : pageBackground
		context.fillRect(0, 0, canvas.width, canvas.height)
	}
	context.scale(layout.scale, layout.scale)

	context.fillStyle = pageBackground === "#fafafa" || pageBackground === "#f5f5f5"
		? "#171717"
		: "#ffffff"
	context.font = "700 32px system-ui, sans-serif"
	context.textBaseline = "middle"
	context.fillText("AniTools Tier List", PAGE_PADDING, PAGE_PADDING + 24)

	const images = await preloadCovers(snapshot)
	for (const lane of layout.lanes) {
		drawLane(context, lane, layout, snapshot.settings.selectedBackground, images)
	}

	return await canvasToBlob(canvas, format)
}

export function downloadTierlistBlob(blob: Blob, filename: string): void {
	if (!import.meta.client) return

	const objectUrl = URL.createObjectURL(blob)
	const anchor = document.createElement("a")
	anchor.href = objectUrl
	anchor.download = filename
	anchor.click()
	window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

export function getTierlistExportEntryCount(
	tiers: TierlistTier[],
	unranked: TierlistEntry[]
): number {
	return unranked.length + tiers.reduce((total, tier) => total + tier.entries.length, 0)
}

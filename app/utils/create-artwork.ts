export const CREATE_PRESET_IDS = [
	"story",
	"square",
	"badge",
	"anilist-thumbnail",
	"banner"
] as const

export const CREATE_EXPORT_FORMATS = ["png", "jpeg", "webp"] as const

export type CreatePresetId = typeof CREATE_PRESET_IDS[number]
export type CreateExportFormat = typeof CREATE_EXPORT_FORMATS[number]

export interface CreatePreset {
	id: CreatePresetId
	label: string
	description: string
	width: number
	height: number
	icon: string
}

export interface CoverCrop {
	sourceX: number
	sourceY: number
	sourceWidth: number
	sourceHeight: number
}

export const CREATE_PRESETS: Readonly<Record<CreatePresetId, CreatePreset>> = {
	story: {
		id: "story",
		label: "Story",
		description: "Vertical social story",
		width: 1080,
		height: 1920,
		icon: "i-lucide-smartphone"
	},
	square: {
		id: "square",
		label: "Square",
		description: "Square social post",
		width: 1080,
		height: 1080,
		icon: "i-lucide-square"
	},
	badge: {
		id: "badge",
		label: "Badge",
		description: "Avatar or community badge",
		width: 512,
		height: 512,
		icon: "i-lucide-badge"
	},
	"anilist-thumbnail": {
		id: "anilist-thumbnail",
		label: "AniList thumbnail",
		description: "2:3 media thumbnail",
		width: 1000,
		height: 1500,
		icon: "i-lucide-gallery-vertical-end"
	},
	banner: {
		id: "banner",
		label: "Banner",
		description: "Wide profile or community banner",
		width: 1500,
		height: 500,
		icon: "i-lucide-panorama"
	}
}

export function getCreatePreset(id: CreatePresetId): CreatePreset {
	return CREATE_PRESETS[id]
}

export function calculateCoverCrop(
	sourceWidth: number,
	sourceHeight: number,
	targetWidth: number,
	targetHeight: number,
	zoom = 1,
	positionX = 0.5,
	positionY = 0.5
): CoverCrop {
	if (
		sourceWidth <= 0
		|| sourceHeight <= 0
		|| targetWidth <= 0
		|| targetHeight <= 0
	) {
		return {
			sourceX: 0,
			sourceY: 0,
			sourceWidth: 0,
			sourceHeight: 0
		}
	}

	const safeZoom = Math.min(3, Math.max(1, zoom))
	const safePositionX = Math.min(1, Math.max(0, positionX))
	const safePositionY = Math.min(1, Math.max(0, positionY))
	const targetRatio = targetWidth / targetHeight
	const sourceRatio = sourceWidth / sourceHeight
	let cropWidth = sourceWidth
	let cropHeight = sourceHeight

	if (sourceRatio > targetRatio) {
		cropWidth = sourceHeight * targetRatio
	} else {
		cropHeight = sourceWidth / targetRatio
	}

	cropWidth /= safeZoom
	cropHeight /= safeZoom

	return {
		sourceX: (sourceWidth - cropWidth) * safePositionX,
		sourceY: (sourceHeight - cropHeight) * safePositionY,
		sourceWidth: cropWidth,
		sourceHeight: cropHeight
	}
}

export function sanitizeCreateFilename(value: string): string {
	const normalized = value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("en")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80)

	return normalized || "anitools-artwork"
}

export function getCreateExportFilename(
	title: string,
	preset: CreatePresetId,
	format: CreateExportFormat
): string {
	const extension = format === "jpeg" ? "jpg" : format
	return `${sanitizeCreateFilename(title)}-${preset}.${extension}`
}

export function getCreateMimeType(format: CreateExportFormat): string {
	return `image/${format}`
}

export function wrapCreateText(
	text: string,
	maxWidth: number,
	measure: (value: string) => number,
	maxLines = 4
): string[] {
	const words = text.trim().split(/\s+/).filter(Boolean)
	if (!words.length || maxLines <= 0) return []

	const lines: string[] = []
	let currentLine = ""

	for (const word of words) {
		const candidate = currentLine ? `${currentLine} ${word}` : word
		if (measure(candidate) <= maxWidth || !currentLine) {
			currentLine = candidate
			continue
		}

		lines.push(currentLine)
		currentLine = word
		if (lines.length === maxLines - 1) break
	}

	if (currentLine && lines.length < maxLines) {
		const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length
		const isTruncated = consumedWords + currentLine.split(/\s+/).length < words.length
		if (isTruncated) {
			let truncated = currentLine
			while (truncated && measure(`${truncated}…`) > maxWidth) {
				truncated = truncated.slice(0, -1).trimEnd()
			}
			currentLine = `${truncated}…`
		}
		lines.push(currentLine)
	}

	return lines
}

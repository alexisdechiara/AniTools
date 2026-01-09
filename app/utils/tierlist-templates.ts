import rawTemplatesJson from "~/content/tierlist-templates.json"

export interface TierTemplateTier {
	name: string
	color: string
	range: [number, number]
}

export interface TierTemplate {
	label: string
	value: TierTemplateTier[]
}

interface RawTemplateTier {
	name: string
	color: string
	range: number[]
	entries?: unknown[]
}

interface RawTemplate {
	label: string
	value: RawTemplateTier[]
}

const colorToTailwind: Record<string, string> = {
	"#E13333": "bg-red-400",
	"#e58e2b": "bg-orange-400",
	"#f9c62d": "bg-yellow-400",
	"#6ac75a": "bg-green-500",
	"#67aeed": "bg-blue-400",
	"#6188E2": "bg-indigo-400",
	"#673AB7": "bg-violet-500",
	"#2B2D42": "bg-black"
}

function normalizeRange(range: number[]): [number, number] {
	const min = Number(range[0] ?? 0)
	const max = Number(range[1] ?? min)
	return [Math.round(min * 10), Math.round(max * 10)]
}

export const tierlistTemplates: TierTemplate[] = (rawTemplatesJson as unknown as RawTemplate[]).map((t) => {
	return {
		label: String(t.label),
		value: t.value.map((tier) => {
			const color = String(tier.color)
			return {
				name: String(tier.name),
				color: colorToTailwind[color] ?? "bg-neutral-500",
				range: normalizeRange(tier.range)
			}
		})
	}
})

export const defaultTierlistTemplateIndex = 0

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
				color: /^#[0-9a-f]{6}$/i.test(color) ? color : "#737373",
				range: normalizeRange(tier.range)
			}
		})
	}
})

export const defaultTierlistTemplateIndex = 0

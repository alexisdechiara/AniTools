import type { StatisticMetric } from "./statistics"

export interface DonutCardItem {
	color: string
	name: string
	value: number
	count: number
	meanScore?: number
	minutesWatched?: number
}

export interface DonutCardDisplayProps {
	maxItems?: number
	showLegend?: boolean
	showTooltip?: boolean
	orientation?: "horizontal" | "vertical"
	width?: string
	height?: string
}

export function donutMetricValue(
	item: Partial<Record<StatisticMetric, number | null>>,
	metric: StatisticMetric
): number {
	return item[metric] ?? 0
}

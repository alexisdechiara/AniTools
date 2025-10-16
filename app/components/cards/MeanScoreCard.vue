<template>
  <MetricsCard title="Mean Score" value="70%" v-bind="$attrs" >
		<BarChart
			:data="scoring"
			:height="200"
			:categories="categories"
			:y-axis="['score']"
			:x-num-ticks="12"
			:radius="8"
			:y-grid-line="true"
			:x-formatter="xFormatter"
			:y-formatter="yFormatter"
			:hide-legend="true"
			:hide-y-axis="true"
		/>
	</MetricsCard>
</template>

<script setup lang="ts">

const scoring: ScoringData[] = [
  { month: 'January', score: 55 },
	{ month: 'February', score: 80 },
  { month: 'March', score: 75 },
  { month: 'April', score: 78 },
  { month: 'May', score: 70 },
  { month: 'June', score: 65 },
	{ month: 'July', score: 90 },
	{ month: 'August', score: 63 },
	{ month: 'September', score: 74 },
	{ month: 'October', score: 50 },
	{ month: 'November', score: 78 },
	{ month: 'December', score: 60 },
]

type ScoringData = {
	month: string
	score: number | string
}

const categories = computed(() => ({
  score: {
    name: 'Score',
    color: 'var(--ui-primary)',
  },
}))

const xFormatter = (i: number): string => `${ scoring[i]?.month }`
const yFormatter = (tick: number) => tick.toString()
</script>

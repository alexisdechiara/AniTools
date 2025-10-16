<template>
  <MetricsCard v-bind="$attrs" >
		<DonutChart
			:data="DonutData.map((i) => i.value)"
			:height="200"
			:labels="DonutData"
			:hide-legend="true"
			:arc-width="24"
			:pad-angle="0.05"
			:radius="16"
  	/>
			<ul class="mx-4 text-sm">
				<li v-for="data in DonutData" class="flex justify-start items-center gap-x-2 my-2">
					<div class="size-2 rounded-full" :style="{ backgroundColor: data.color }" />
					{{ data.name }}
					<span class="ms-auto">{{ data.value }} %</span>
				</li>
			</ul>
	</MetricsCard>
</template>

<script lang="ts" setup>
const DonutData = [
  {
    color: "var(--ui-primary)",
    name: 'Completed',
    value: 64,
  },
  {
    color: "var(--ui-warning)",
    name: 'Planing',
    value: 31,
  },
  {
    color: 'var(--ui-error)',
    name: 'Dropped',
    value: 3,
  },
  {
    color: 'var(--ui-success)',
    name: 'Watching',
    value: 3,
  },
]
</script>

<style scoped>
.unovis-single-container {
	--vis-donut-background-color: white !important;
}
</style>

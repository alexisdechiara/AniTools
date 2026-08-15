<script setup lang="ts">
const props = withDefaults(defineProps<{
	label: string
	min: number
	max: number
	step: number
	decimals?: number
	unit?: string
	display?: "number" | "percent"
}>(), {
	decimals: 0,
	unit: "",
	display: "number"
})

const model = defineModel<number>({ required: true })
const ticks = computed(() => Array.from({ length: 3 }, (_, index) =>
	props.min + ((props.max - props.min) * index / 2)
))

function formatValue(value: number): string {
	if (props.display === "percent") return `${Math.round(value * 100)}%`
	return `${value.toFixed(props.decimals)}${props.unit}`
}
</script>

<template>
	<UFormField :label="`${label} · ${formatValue(model)}`">
		<USlider
			v-model="model"
			:min="min"
			:max="max"
			:step="step"
			:aria-label="label" />
		<div class="mt-1 flex justify-between text-[9px] leading-none text-dimmed" aria-hidden="true">
			<span v-for="tick in ticks" :key="tick">
				{{ formatValue(tick) }}
			</span>
		</div>
	</UFormField>
</template>

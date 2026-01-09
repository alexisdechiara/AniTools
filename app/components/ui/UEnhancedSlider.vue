<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type ShowSteps = false | 'always' | 'active'

type Mark =
	| string
	| {
		label: string
		style?: Record<string, string>
	}

const props = defineProps<{
	modelValue: number | [number, number]
	showSteps?: ShowSteps
	marks?: Record<number, Mark>
}>()

const emit = defineEmits<{
	(e: 'update:modelValue', value: number | [number, number]): void
}>()

const attrs = useAttrs()

const min = computed(() => Number(attrs.min ?? 0))
const max = computed(() => Number(attrs.max ?? 100))
const step = computed(() => Number(attrs.step ?? 1))
const range = computed(() => Array.isArray(props.modelValue))
const vertical = computed(() => attrs.orientation === 'vertical' || Boolean(attrs.vertical))

const steps = computed(() => {
	const count = Math.floor((max.value - min.value) / step.value)
	return Array.from({ length: count + 1 }, (_, i) => min.value + i * step.value)
})

const positionPercent = (value: number) =>
	((value - min.value) / (max.value - min.value)) * 100

const isActiveStep = (value: number) => {
	if (!range.value) {
		return value <= (props.modelValue as number)
	}

	const [minValue, maxValue] = props.modelValue as [number, number]
	return value >= minValue && value <= maxValue
}

const onUpdateModelValue = (value: number | [number, number] | undefined) => {
	if (value === undefined) {
		return
	}

	emit('update:modelValue', value)
}
</script>

<template>
	<div class="relative" :class="vertical && 'flex flex-col items-center'">
		<USlider v-bind="attrs" :model-value="modelValue" class="z-10" @update:model-value="onUpdateModelValue" />

		<!-- Steps -->
		<div v-if="showSteps" class="absolute pointer-events-none z-20" :class="vertical
			? 'inset-y-0 left-1/2 -translate-x-1/2'
			: 'inset-x-0 top-1/2 -translate-y-1/2'">
			<span v-for="stepValue in steps" :key="stepValue" class="absolute size-1.5 rounded-full transition-colors" :class="[
				showSteps === 'always' || isActiveStep(stepValue)
				? 'bg-primary'
				: 'bg-muted/60'
	,
	vertical ? '-translate-x-1/2 translate-y-1/2' : '-translate-x-1/2 -translate-y-1/2'
]" :style="vertical
					? { bottom: positionPercent(stepValue) + '%' }
					: { left: positionPercent(stepValue) + '%' }" />
		</div>

		<!-- Marks -->
		<div v-if="marks" class="relative w-full mt-3" :class="vertical && 'mt-0 ml-4 h-full'">
			<span v-for="(mark, value) in marks" :key="value" class="absolute text-xs text-muted whitespace-nowrap"
				:class="vertical ? '-translate-y-1/2' : '-translate-x-1/2'" :style="[
					vertical
						? { bottom: positionPercent(Number(value)) + '%' }
						: { left: positionPercent(Number(value)) + '%' },
					typeof mark === 'object' ? mark.style : {}
				]">
				{{ typeof mark === 'string' ? mark : mark.label }}
			</span>
		</div>
	</div>
</template>

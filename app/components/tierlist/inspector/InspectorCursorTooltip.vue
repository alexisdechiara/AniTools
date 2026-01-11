<template>
	<UTooltip v-model:open="tooltipOpen" v-if="hoveredTarget" :text="hoveredTarget.name || ''" :reference="cursorRef"
		:content="{ side: 'right', align: 'end', sideOffset: 10, updatePositionStrategy: 'always' }" :delay-duration="0"
		:ui="{ content: 'rounded-tl-sm! rounded-full translate-y-10' }">
	</UTooltip>
</template>

<script setup lang="ts">
const { isInspectorEnabled, hoveredTarget, cursorPosition } = useInspector()

const tooltipOpen = computed(() => isInspectorEnabled.value && !!hoveredTarget.value?.name)

const cursorRef = computed(() => ({
	getBoundingClientRect: () => ({
		width: 0,
		height: 0,
		left: cursorPosition.value.x,
		right: cursorPosition.value.x,
		top: cursorPosition.value.y,
		bottom: cursorPosition.value.y,
		...cursorPosition.value
	} as DOMRect)
}))
</script>

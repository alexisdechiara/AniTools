<template>
	<UTooltip v-model:open="tooltipOpen" :text="hoveredTarget?.name || ''" :reference="cursorRef"
		:content="{ side: 'right', sideOffset: 12, updatePositionStrategy: 'always' }" :delay-duration="0">
		<div class="w-0 h-0" />
	</UTooltip>
</template>

<script setup lang="ts">
const { isInspectorEnabled, hoveredTarget, cursorPosition } = useInspector()

// Control tooltip open state
const tooltipOpen = computed(() => isInspectorEnabled.value && !!hoveredTarget.value)

// Memoized cursor reference to prevent unnecessary recalculations
const cursorRef = computed(() => {
	const pos = cursorPosition.value
	return {
		getBoundingClientRect: () => ({
			width: 0,
			height: 0,
			left: pos.x,
			right: pos.x,
			top: pos.y,
			bottom: pos.y,
			...pos
		} as DOMRect)
	}
})
</script>

<template>
	<div class="grid grid-cols-12 min-h-28 w-full transition-all duration-200 relative group/row rounded-lg"
		:class="[selectedBackground, rowCornerClass, (hoveredTarget?.id === `row-${index}` && hoveredTarget?.type === 'row') ? 'ring-2 ring-primary ring-offset-2 ring-offset-background cursor-pointer' : '']"
		@click.stop="selectItem" @mouseover.stop="setHovered(`row-${index}`, 'row', 'Tier Row')" @mouseleave="clearHovered">
		<!-- Invisible absolute padding for easier hovering -->
		<div v-if="isInspectorEnabled" class="absolute -inset-8 z-10" />
		<div
			class="relative z-20 text-inverted text-lg font-semibold size-full flex justify-center items-center group/control transition-all duration-200"
			:class="[colWidthClass, headingCorner ? rowCornerClass : 'rounded-none', tier.color, (hoveredTarget?.id === `header-${index}` && hoveredTarget?.type === 'header') ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '', isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto']">

			<!-- Header Interaction Hitbox -->
			<div v-if="isInspectorEnabled" class="absolute left-2 right-0 inset-y-4 z-10 pointer-events-auto cursor-pointer"
				@click.stop="selectItem" @mouseover.stop="setHovered(`header-${index}`, 'header', 'Tier Header')"
				@mouseleave="clearHovered" />

			<UTextarea autoresize v-model.lazy="tier.name" variant="none"
				:ui="{ root: 'size-full', base: 'text-center text-lg font-semibold text-inverted bg-transparent flex-wrap place-content-center' }" />
			<div
				class="absolute flex flex-col -left-8 h-full items-center justify-center opacity-0 hover:opacity-100 group-hover/control:opacity-100 transition-opacity pointer-events-auto z-20">
				<UButton icon="i-lucide-chevron-up" color="neutral" variant="link" class="cursor-pointer text-highlighted"
					@click="moveTierUp(index)" :disabled="isFirst" />
				<UButton icon="i-lucide-grip-vertical" color="neutral" variant="link"
					class="cursor-grab grip-handle text-highlighted active:cursor-grabbing" />
				<UButton icon="i-lucide-chevron-down" color="neutral" variant="link" class="cursor-pointer text-highlighted"
					@click="moveTierDown(index)" :disabled="isLast" />
			</div>
		</div>
		<div class="col-span-11 w-full relative z-20"
			:class="[(hoveredTarget?.id === `content-${index}` && hoveredTarget?.type === 'content') ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '', isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto']">
			<!-- Content Interaction Hitbox -->
			<div v-if="isInspectorEnabled" class="absolute inset-y-8 left-0 right-8 z-10 pointer-events-auto cursor-pointer"
				@click.stop="selectItem" @mouseover.stop="setHovered(`content-${index}`, 'content', 'Tier Content')"
				@mouseleave="clearHovered" />

			<DraggableTier v-model="tier.entries"
				:class="[isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto']" />
		</div>
	</div>
</template>

<script lang="ts" setup>
interface Tier {
	name: string
	color: string
	range: Array<number>
	entries: Array<any>
}

const props = defineProps<{
	tier: Tier,
	index: number,
	isFirst: boolean,
	isLast: boolean
}>()

const tierlistStore = useTierlistStore()

const {
	selectedBackground,
	rowCornerClass,
	colWidthClass,
	headingCorner
} = storeToRefs(tierlistStore)

const { moveTierUp, moveTierDown } = tierlistStore
const { isInspectorEnabled, setHovered, clearHovered, selectItem, hoveredTarget } = useInspector()
</script>

<style scoped></style>

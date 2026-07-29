<template>
	<div
		class="group/row relative flex min-h-28 w-full flex-col rounded-lg transition-all duration-200 sm:grid sm:grid-cols-12"
		:class="[
			selectedBackground,
			rowCornerClass,
			hoveredTarget?.id === `row-${tier.id}` && hoveredTarget?.type === 'row'
				? 'cursor-pointer ring-2 ring-primary ring-offset-2 ring-offset-default'
				: ''
		]"
		@click.stop="selectItem"
		@mouseover.stop="setHovered(`row-${tier.id}`, 'row', 'Tier Row')"
		@mouseleave="clearHovered">
		<div v-if="isInspectorEnabled" class="absolute -inset-6 z-10" />
		<div
			class="group/control relative z-20 flex size-full min-h-20 items-center justify-center text-lg font-semibold text-inverted transition-all duration-200"
			:class="[
				colWidthClass,
				headingCorner ? rowCornerClass : 'rounded-none',
				!isHexColor ? tier.color : '',
				hoveredTarget?.id === `header-${tier.id}` && hoveredTarget?.type === 'header'
					? 'ring-2 ring-primary ring-offset-2 ring-offset-default'
					: '',
				isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto'
			]"
			:style="isHexColor ? { backgroundColor: tier.color } : undefined">
			<div
				v-if="isInspectorEnabled"
				class="pointer-events-auto absolute inset-y-4 right-0 left-2 z-10 cursor-pointer"
				@click.stop="selectItem"
				@mouseover.stop="setHovered(`header-${tier.id}`, 'header', 'Tier Header')"
				@mouseleave="clearHovered" />

			<UTextarea
				v-model.lazy="tierName"
				autoresize
				variant="none"
				:aria-label="`Name of tier ${tier.name}`"
				:ui="{ root: 'size-full', base: 'text-center text-lg font-semibold text-inverted bg-transparent flex-wrap place-content-center' }" />
			<div
				class="absolute -left-8 z-20 flex h-full flex-col items-center justify-center opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/control:opacity-100 sm:group-hover/control:opacity-100">
				<UButton
					icon="i-lucide-chevron-up"
					color="neutral"
					variant="link"
					class="cursor-pointer text-highlighted"
					:aria-label="`Move ${tier.name} up`"
					:disabled="isFirst"
					@click="moveTierUp(index)" />
				<UButton
					icon="i-lucide-grip-vertical"
					color="neutral"
					variant="link"
					:aria-label="`Drag ${tier.name} tier`"
					data-tier-handle
					class="cursor-grab text-highlighted active:cursor-grabbing" />
				<UButton
					icon="i-lucide-chevron-down"
					color="neutral"
					variant="link"
					class="cursor-pointer text-highlighted"
					:aria-label="`Move ${tier.name} down`"
					:disabled="isLast"
					@click="moveTierDown(index)" />
			</div>
		</div>
		<div
			class="relative z-20 w-full"
			:class="[
				bodyColWidthClass,
				hoveredTarget?.id === `content-${tier.id}` && hoveredTarget?.type === 'content'
					? 'ring-2 ring-primary ring-offset-2 ring-offset-default'
					: '',
				isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto'
			]">
			<div
				v-if="isInspectorEnabled"
				class="pointer-events-auto absolute inset-y-6 right-8 left-0 z-10 cursor-pointer"
				@click.stop="selectItem"
				@mouseover.stop="setHovered(`content-${tier.id}`, 'content', 'Tier Content')"
				@mouseleave="clearHovered" />
			<DraggableTier
				v-model="tierEntries"
				:lane-id="tier.id"
				:class="isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto'" />
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { TierlistTier } from "~/types/tierlist"

const props = defineProps<{
	tier: TierlistTier
	index: number
	isFirst: boolean
	isLast: boolean
}>()

const emit = defineEmits<{
	"update:name": [value: string]
	"update:entries": [value: TierlistTier["entries"]]
}>()

const tierName = computed({
	get: () => props.tier.name,
	set: value => emit("update:name", value)
})
const tierEntries = computed({
	get: () => props.tier.entries,
	set: value => emit("update:entries", value)
})
const isHexColor = computed(() => /^#[0-9a-f]{3,8}$/i.test(props.tier.color))

const tierlistStore = useTierlistStore()
const {
	selectedBackground,
	rowCornerClass,
	colWidthClass,
	bodyColWidthClass,
	headingCorner
} = storeToRefs(tierlistStore)
const { moveTierUp, moveTierDown } = tierlistStore
const {
	isInspectorEnabled,
	setHovered,
	clearHovered,
	selectItem,
	hoveredTarget
} = useInspector()
</script>

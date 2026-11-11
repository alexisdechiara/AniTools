<template>
	<div
		class="group/row relative flex w-full rounded-lg transition-shadow duration-200 sm:grid sm:grid-cols-12"
		:data-tier-empty-row="isEmpty ? '' : undefined"
		:class="[
			isEmpty ? 'min-h-14 flex-row' : 'min-h-28 flex-col',
			screenBackground,
			rowCornerClass,
			hoveredTarget?.id === `row-${tier.id}` && hoveredTarget?.type === 'row'
				? 'cursor-pointer ring-2 ring-primary ring-offset-2 ring-offset-default'
				: ''
		]"
		@click.stop="selectItem"
		@mouseover.stop="setHovered(`row-${tier.id}`, 'row', 'Tier Row')"
		@mouseleave="clearHovered">
		<button
			v-if="isInspectorEnabled"
			type="button"
			class="absolute -inset-6 z-10 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
			:aria-label="`Customize the row of tier ${tier.name}`"
			@click.stop="selectItem"
			@focus="setHovered(`row-${tier.id}`, 'row', 'Tier Row')"
			@blur="clearHovered" />
		<div
			class="group/control relative z-20 flex h-full items-center justify-center text-lg font-semibold transition-[background-color,box-shadow] duration-200"
			:class="[
				isEmpty ? 'min-h-14 w-20 shrink-0 sm:w-full' : 'min-h-20 w-full',
				colWidthClass,
				headingCorner ? rowCornerClass : 'rounded-none',
				isHexColor ? 'tier-ink' : 'text-inverted',
				!isHexColor ? tier.color : '',
				hoveredTarget?.id === `header-${tier.id}` && hoveredTarget?.type === 'header'
					? 'ring-2 ring-primary ring-offset-2 ring-offset-default'
					: '',
				isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto'
			]"
			:style="isHexColor ? { backgroundColor: tier.color, '--tier-color': tier.color } : undefined">
			<button
				v-if="isInspectorEnabled"
				type="button"
				class="pointer-events-auto absolute inset-y-4 right-0 left-2 z-10 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
				:aria-label="`Customize the header of tier ${tier.name}`"
				@click.stop="selectItem"
				@focus="setHovered(`header-${tier.id}`, 'header', 'Tier Header')"
				@blur="clearHovered"
				@mouseover.stop="setHovered(`header-${tier.id}`, 'header', 'Tier Header')"
				@mouseleave="clearHovered" />

			<UTextarea
				v-model.lazy="tierName"
				autoresize
				:rows="1"
				variant="none"
				:aria-label="`Name of tier ${tier.name}`"
				:ui="{
					root: 'w-full px-1.5',
					base: `text-center text-lg font-semibold bg-transparent flex-wrap place-content-center ${isHexColor ? 'tier-ink' : 'text-inverted'}`
				}" />
			<div
				class="absolute -left-8 z-20 flex h-full flex-col items-center justify-center opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/control:opacity-100 sm:group-hover/control:opacity-100">
				<UButton
					icon="i-lucide-chevron-up"
					color="neutral"
					variant="link"
					class="cursor-pointer text-highlighted"
					:class="isEmpty ? 'max-sm:py-1' : ''"
					:aria-label="`Move ${tier.name} up`"
					:disabled="isFirst"
					@click="moveTierUp(index)" />
				<UButton
					icon="i-lucide-grip-vertical"
					color="neutral"
					variant="link"
					:aria-label="`Drag ${tier.name} tier`"
					data-tier-handle
					class="cursor-grab text-highlighted active:cursor-grabbing"
					:class="isEmpty ? 'max-sm:hidden' : ''" />
				<UButton
					icon="i-lucide-chevron-down"
					color="neutral"
					variant="link"
					class="cursor-pointer text-highlighted"
					:class="isEmpty ? 'max-sm:py-1' : ''"
					:aria-label="`Move ${tier.name} down`"
					:disabled="isLast"
					@click="moveTierDown(index)" />
			</div>
		</div>
		<div
			class="relative z-20 w-full min-w-0"
			:class="[
				bodyColWidthClass,
				hoveredTarget?.id === `content-${tier.id}` && hoveredTarget?.type === 'content'
					? 'ring-2 ring-primary ring-offset-2 ring-offset-default'
					: '',
				isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto'
			]">
			<button
				v-if="isInspectorEnabled"
				type="button"
				class="pointer-events-auto absolute inset-y-6 right-8 left-0 z-10 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
				:aria-label="`Customize the content area of tier ${tier.name}`"
				@click.stop="selectItem"
				@focus="setHovered(`content-${tier.id}`, 'content', 'Tier Content')"
				@blur="clearHovered"
				@mouseover.stop="setHovered(`content-${tier.id}`, 'content', 'Tier Content')"
				@mouseleave="clearHovered" />
			<DraggableTier
				v-model="tierEntries"
				:lane-id="tier.id"
				compact-when-empty
				:class="isInspectorEnabled ? 'pointer-events-none' : 'pointer-events-auto'" />
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { TierlistTier } from "~/types/tierlist"
import { tierlistScreenBackground } from "~/utils/tierlist"

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
const isEmpty = computed(() => props.tier.entries.length === 0)
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
// On-screen only: the image export reads the stored value, not this class.
const screenBackground = computed(() => tierlistScreenBackground(selectedBackground.value))
const {
	isInspectorEnabled,
	setHovered,
	clearHovered,
	selectItem,
	hoveredTarget
} = useInspector()
</script>

<style scoped>
/* variant="none" strips the field ring, so the tier name needs its own focus indicator. */
:deep(textarea:focus-visible) {
	border-radius: 0.375rem;
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
	/* Fills the offset gap so the ring also reads on a tier colour close to the primary. */
	box-shadow: 0 0 0 2px var(--ui-bg);
}
</style>

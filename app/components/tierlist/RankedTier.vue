<template>
	<div class="grid grid-cols-12 min-h-32 w-full" :class="[selectedBackground, rowCornerClass]">
		<div class="relative text-inverted text-lg font-semibold size-full flex justify-center items-center group/control"
			:class="[colWidthClass, headingCorner ? rowCornerClass : 'rounded-none', tier.color]">
			{{ tier.name }}
			<div
				class="absolute flex flex-col -left-8 h-full items-center justify-center opacity-0 hover:opacity-100 group-hover/control:opacity-100 transition-opacity">
				<UButton icon="i-lucide-chevron-up" color="neutral" variant="link" class="cursor-pointer text-highlighted"
					@click="moveTierUp(index)" :disabled="isFirst" />
				<UButton icon="i-lucide-grip-vertical" color="neutral" variant="link" class="cursor-grab text-highlighted" />
				<UButton icon="i-lucide-chevron-down" color="neutral" variant="link" class="cursor-pointer text-highlighted"
					@click="moveTierDown(index)" :disabled="isLast" />
			</div>
		</div>
		<DraggableTier v-model="tier.entries" />
	</div>
</template>

<script lang="ts" setup>
interface Tier {
	name: string
	color: string
	range: Array<number>
	entries: Array<any>
}

defineProps<{
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
</script>

<style scoped></style>

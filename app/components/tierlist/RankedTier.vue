<template>
	<div class="grid grid-cols-12 min-h-32 w-full overflow-hidden" :class="[selectedBackground, rowCornerClass]">
		<div class="text-inverted text-lg font-semibold size-full flex justify-center items-center"
			:class="[colWidthClass, headingCorner ? rowCornerClass : 'rounded-none', tier.color]">
			{{ tier.name }}
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
	tier: Tier
}>()

const settingsStore = useTierlistSettingsStore()

const {
	selectedBackground,
	rowCornerClass,
	colWidthClass,
	headingCorner
} = storeToRefs(settingsStore)
</script>

<style scoped></style>

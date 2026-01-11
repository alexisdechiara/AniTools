<template>
	<div class="flex flex-col gap-4">
		<UFormField label="Gap">
			<URadioGroup v-model="gapSize" :items="tierlistGapOptions" size="xs" variant="table" indicator="hidden"
				orientation="horizontal" :ui="{ item: 'w-full' }" />
		</UFormField>
		<UFormField label="Rounded corner">
			<URadioGroup v-model="rowCorner" :items="tierlistCornerOptions" size="xs" orientation="horizontal"
				variant="table" indicator="hidden" :ui="{ item: 'w-full' }" />
		</UFormField>
	</div>
</template>

<script setup lang="ts">
import { tierlistGapOptions, tierlistCornerOptions } from "~/utils/tierlist-data"

const tierlistStore = useTierlistStore()
const { gapSize, rowCorner } = storeToRefs(tierlistStore)
</script>

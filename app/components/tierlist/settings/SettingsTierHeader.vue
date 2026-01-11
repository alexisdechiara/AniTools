<template>
	<div class="flex flex-col gap-4">
		<UFormField orientation="horizontal" label="Rounded separator">
			<USwitch v-model="headingCorner" />
		</UFormField>
		<UFormField label="Width">
			<URadioGroup v-model="colWidth" :items="tierlistColWidthOptions" size="xs" orientation="horizontal"
				variant="table" indicator="hidden" :ui="{ item: 'w-full' }" />
		</UFormField>
	</div>
</template>

<script setup lang="ts">
import { tierlistColWidthOptions } from "~/utils/tierlist-data"

const tierlistStore = useTierlistStore()
const { headingCorner, colWidth } = storeToRefs(tierlistStore)
</script>

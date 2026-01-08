<template>
	<VueDraggable v-model="modelValue" group="tiers" class="col-span-11 size-full flex flex-wrap">
		<NuxtImg
			:src="item.media?.coverImage?.extraLarge || item.media?.coverImage?.large || item.media?.coverImage?.medium"
			v-for="item in modelValue" :key="item.id" class="h-32 w-24 object-cover cursor-move" />
	</VueDraggable>
</template>

<script lang="ts" setup>
import { VueDraggable } from "vue-draggable-plus"

const modelValue = defineModel<any>()

</script>

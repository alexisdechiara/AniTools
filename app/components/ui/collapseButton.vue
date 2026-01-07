<template>
	<UCollapsible class="flex flex-col" v-bind="$attrs">
		<UButton size="xl" class="group" :label="label" color="neutral" variant="link" trailing-icon="i-lucide-chevron-down"
			:ui="{
				base: `${first ? '' : 'border-t'} rounded-none border-neutral-200 text-muted`,
				trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
			}" block />

		<template #content>
			<div class="px-3 pb-6 size-full flex flex-col gap-2">
				<slot />
			</div>
		</template>
	</UCollapsible>
</template>

<script lang="ts" setup>

defineProps<{
	label: string,
	first?: boolean,
	last?: boolean
}>()
</script>

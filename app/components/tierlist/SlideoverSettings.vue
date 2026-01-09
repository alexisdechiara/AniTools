<script setup lang="ts">
import { computed } from "vue"

const tierlistStore = useTierlistStore()

const {
	templates,
	currentTemplate,
	gapSize,
	headingCorner,
	rowCorner,
	colWidth,
	selectedBackground,
	neutralBackgrounds,
	gapSizeText
} = storeToRefs(tierlistStore)

const templateItems = computed(() => {
	return templates.value.map((t, index) => ({ label: t.label, value: index }))
})

const { setBackground, addTier, changeTemplate } = tierlistStore
</script>

<template>
	<USlideover title="Settings" :overlay="false" :ui="{ content: 'max-w-xs' }">
		<UButton icon="i-lucide-palette" variant="ghost" color="neutral" class="cursor-pointer" />
		<template #content>
			<div class="p-4">
				<CollapseButton label="Tiers" first>
					<UFormField label="Template">
						<USelectMenu :model-value="currentTemplate" :items="templateItems" value-key="value" variant="soft"
							@update:model-value="(value) => changeTemplate(value as number)" />
					</UFormField>
					<UButton label="Add tier" color="neutral" variant="subtle" block class="mt-2" @click="addTier" />
				</CollapseButton>
				<CollapseButton label="Rows">
					<UFormField label="Gap">
						<USlider v-model="gapSize" :step="25"
							:tooltip="{ text: gapSizeText, delayDuration: 0, ui: { text: 'uppercase font-semibold' } }" />
					</UFormField>
					<UFormField label="Rounded corner">
						<USlider v-model="rowCorner" :max="6" />
					</UFormField>
				</CollapseButton>
				<CollapseButton label="Heading">
					<UFormField orientation="horizontal" label="Rounded separator">
						<USwitch v-model="headingCorner" />
					</UFormField>
					<UFormField label="Width">
						<USlider v-model="colWidth" :max="4" />
					</UFormField>
				</CollapseButton>
				<CollapseButton label="Body">
					<UFormField label="Background color">
						<div class="flex gap-0.5">
							<div v-for="bg in neutralBackgrounds" :key="bg" @click="setBackground(bg)"
								class="size-6 first:rounded-l-xs transition-all hover:scale-110 cursor-pointer last:rounded-r-full flex justify-center items-center"
								:class="[bg, selectedBackground === bg ? 'ring-2 ring-offset-2 ring-primary z-50' : '']">
								<UTooltip text="Transparent" :delay="0">
									<Icon v-if="bg === 'bg-transparent'" name="i-lucide-ban" class="text-error" />
								</UTooltip>
							</div>
						</div>
					</UFormField>
				</CollapseButton>
			</div>
		</template>
	</USlideover>
</template>

<template>
	<div class="flex flex-col gap-4">
		<UFormField label="Background color">
			<div class="flex gap-0.5">
				<UTooltip
					v-for="bg in neutralBackgrounds"
					:key="bg"
					:text="bg === 'bg-transparent' ? 'Transparent' : bg.replace('bg-', '').replace('-', ' ')"
					:delay="0">
					<button
						type="button"
						class="flex size-6 w-full cursor-pointer items-center justify-center transition-all first:rounded-l-xs last:rounded-r-full hover:scale-110 focus-visible:z-50 focus-visible:outline-2 focus-visible:outline-primary"
						:class="[bg, selectedBackground === bg ? 'z-50 ring-2 ring-primary ring-offset-2' : '']"
						:aria-label="`Use ${bg.replace('bg-', '').replace('-', ' ')} background`"
						:aria-pressed="selectedBackground === bg"
						@click="setBackground(bg)">
						<Icon v-if="bg === 'bg-transparent'" name="i-lucide-ban" class="text-error" />
					</button>
				</UTooltip>
			</div>
		</UFormField>
		<UFormField label="Number of columns">
			<USlider v-model="nbCol" :min="1" :max="12" tooltip />
		</UFormField>
	</div>
</template>

<script setup lang="ts">
const tierlistStore = useTierlistStore()
const { selectedBackground, neutralBackgrounds, nbCol } = storeToRefs(tierlistStore)
const { setBackground } = tierlistStore
</script>

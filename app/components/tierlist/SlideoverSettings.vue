<template>
	<USlideover v-bind="$attrs" title="Settings" :overlay="false" :ui="{ content: 'max-w-sm p-4' }">
		<template #content>
			<div class="flex h-full flex-col gap-2">
				<div class="mb-3 grid grid-cols-2 gap-2">
					<USelect
:model-value="currentTemplate"
:items="templateItems"
value-key="value"
								@update:model-value="(value) => changeTemplate(value as number)" />
					<div class="flex gap-2">
						<UButton label="Auto Rank" color="neutral" variant="solid" @click="handleAutoRank" />
						<UButton label="Unrank" color="error" variant="solid" @click="unrankAll" />
					</div>
				</div>
				<div class="flex h-full max-h-136 flex-col gap-2 overflow-y-auto">
					<div v-for="(tier, index) in tierlistStore.tiers" :key="tier.id" class="rounded-md bg-muted p-2">
						<div class="flex gap-1">
							<!-- <div class="flex flex-col justify-center items-center w-fit">
									<Icon name="i-lucide-grip-vertical" class="cursor-grab" />
								</div> -->
							<div class="size-full">
								<div class="mb-2 flex gap-2">
									<UInput v-model="tier.name" size="sm" class="flex-1" />
									<UPopover>
										<UButton
color="neutral"
variant="outline"
icon="i-lucide-swatch-book"
class="cursor-pointer"
											size="sm" />
										<template #content>
											<UColorPicker v-model="tier.color" class="p-2" />
										</template>
									</UPopover>
								</div>
								<USlider v-model="tier.range" :min="0" :max="100" size="sm" tooltip />
							</div>
							<UButton
icon="i-lucide-trash"
size="sm"
color="error"
variant="solid"
class="ms-2 cursor-pointer"
								@click="removeTier(index)" />
						</div>
					</div>
				</div>
				<UButton
label="Add tier"
icon="i-lucide-plus"
color="neutral"
variant="subtle"
class="mt-2"
block
					@click="addTier" />
			</div>
		</template>
	</USlideover>

	<!-- Warning popup for overlapping ranges -->
	<OverlappingRangesWarning
v-model:open="showOverlappingWarning"
:overlapping-ranges="overlappingRanges"
		@confirm="handleOverlappingConfirm"
@cancel="handleOverlappingCancel" />
</template>

<script setup lang="ts">
import { computed } from "vue"

const tierlistStore = useTierlistStore()

const {
	templates,
	currentTemplate,
} = storeToRefs(tierlistStore)

const templateItems = computed(() => {
	return templates.value.map((t, index) => ({ label: t.label, value: index }))
})

const {
	addTier,
	changeTemplate,
	removeTier,
	autoRankAll,
	unrankAll,
	checkOverlappingRanges
} = tierlistStore

const showOverlappingWarning = ref(false)
const overlappingRanges = ref<string[]>([])

function handleAutoRank() {
	// Vérifier les ranges qui se chevauchent
	const overlaps = checkOverlappingRanges()

	if (overlaps.length > 0) {
		overlappingRanges.value = overlaps
		showOverlappingWarning.value = true
	} else {
		// Pas de chevauchement, procéder immédiatement
		performAutoRank()
	}
}

function performAutoRank() {
	autoRankAll()
}

function handleOverlappingConfirm() {
	// Procéder avec duplication autorisée
	performAutoRankWithDuplicates()
	showOverlappingWarning.value = false
}

function handleOverlappingCancel() {
	// Ne rien faire, juste fermer la popup
	showOverlappingWarning.value = false
}

function performAutoRankWithDuplicates() {
	autoRankAll(true)
}

</script>

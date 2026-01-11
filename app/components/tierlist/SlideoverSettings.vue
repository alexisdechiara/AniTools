<template>
	<USlideover v-bind="$attrs" title="Settings" :overlay="false" :ui="{ content: 'max-w-sm p-4' }">
		<template #content>
			<div class="flex flex-col gap-2 h-full">
				<div class="grid grid-cols-2 gap-2 mb-3">
					<USelect :model-value="currentTemplate" :items="templateItems" value-key="value"
								@update:model-value="(value) => changeTemplate(value as number)" />
					<div class="flex gap-2">
						<UButton label="Auto Rank" color="neutral" variant="solid" @click="handleAutoRank" />
						<UButton label="Unrank" color="error" variant="solid" @click="unrankAll" />
					</div>
				</div>
				<div class="flex flex-col gap-2 h-full overflow-y-auto max-h-136">
					<div v-for="(tier, index) in tierlistStore.tiers" :key="index" class="p-2 bg-muted rounded-md">
						<div class="flex gap-1">
							<!-- <div class="flex flex-col justify-center items-center w-fit">
									<Icon name="i-lucide-grip-vertical" class="cursor-grab" />
								</div> -->
							<div class="size-full">
								<div class="flex gap-2 mb-2">
									<UInput v-model="tier.name" size="sm" class="flex-1" />
									<UPopover>
										<UButton color="neutral" variant="outline" icon="i-lucide-swatch-book" class="cursor-pointer"
											size="sm" />
										<template #content>
											<UColorPicker v-model="tier.color" class="p-2" />
										</template>
									</UPopover>
								</div>
								<USlider v-model="tier.range" :min="0" :max="100" size="sm" tooltip />
							</div>
							<UButton icon="i-lucide-trash" size="sm" color="error" variant="solid" class="ms-2 cursor-pointer"
								@click="removeTier(index)" />
						</div>
					</div>
				</div>
				<UButton label="Add tier" icon="i-lucide-plus" color="neutral" variant="subtle" class="mt-2" block
					@click="addTier" />
			</div>
		</template>
	</USlideover>

	<!-- Warning popup for overlapping ranges -->
	<OverlappingRangesWarning v-model:open="showOverlappingWarning" :overlapping-ranges="overlappingRanges"
		@confirm="handleOverlappingConfirm" @cancel="handleOverlappingCancel" />
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

const { setBackground, addTier, changeTemplate, removeTier, autoRankAll, unrankAll, checkOverlappingRanges, rankEntries } = tierlistStore

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
	// Récupérer toutes les entrées de tous les tiers et du unranked
	const allEntries: unknown[] = []

	// Ajouter les entrées du unranked tier
	allEntries.push(...tierlistStore.unrankedTier)

	// Ajouter les entrées de tous les tiers
	tierlistStore.tiers.forEach(tier => {
		allEntries.push(...tier.entries)
		// Vider les tiers pour le re-rank
		tier.entries = []
	})

	// Vider le unranked tier
	tierlistStore.unrankedTier = []

	// Procéder au rank
	rankEntries(allEntries)
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
	// Récupérer toutes les entrées de tous les tiers et du unranked
	const allEntries: unknown[] = []

	// Ajouter les entrées du unranked tier
	allEntries.push(...tierlistStore.unrankedTier)

	// Ajouter les entrées de tous les tiers
	tierlistStore.tiers.forEach(tier => {
		allEntries.push(...tier.entries)
		// Vider les tiers pour le re-rank
		tier.entries = []
	})

	// Vider le unranked tier
	tierlistStore.unrankedTier = []

	// Procéder au rank avec duplication
	rankEntries(allEntries, true)
}

</script>

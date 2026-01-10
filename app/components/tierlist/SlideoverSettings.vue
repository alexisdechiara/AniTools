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
	gapSizeText,
	nbCol
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

const items = [
	{
		label: 'Interface',
		icon: 'i-lucide-palette',
		slot: 'interface'
	},
	{
		label: 'Configuration',
		icon: 'i-lucide-settings-2',
		slot: 'configuration'
	}
]
</script>

<template>
	<USlideover title="Settings" :overlay="false" :ui="{ content: 'max-w-sm p-4' }">
		<UButton icon="i-lucide-ellipsis-vertical" variant="ghost" color="neutral" class="cursor-pointer" />
		<template #content>
			<UTabs :items="items">
				<template #interface>
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
						<UFormField label="Number of columns">
							<USlider v-model="nbCol" :min="1" :max="12" tooltip />
						</UFormField>
					</CollapseButton>
				</template>
				<template #configuration>
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
			</UTabs>
		</template>
	</USlideover>

	<!-- Warning popup for overlapping ranges -->
	<OverlappingRangesWarning v-model:open="showOverlappingWarning" :overlapping-ranges="overlappingRanges"
		@confirm="handleOverlappingConfirm" @cancel="handleOverlappingCancel" />
</template>

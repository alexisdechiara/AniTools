<template>
	<UModal v-bind="$attrs" title="Import from AniList" :close="false"
		:ui="{ content: 'max-w-sm', footer: 'justify-end' }"
		description="Select the settings for importing animes from your lists">
		<UButton icon="i-lucide-cloud-download" variant="ghost" color="neutral" class="cursor-pointer" />
		<template #body>
			<div class="flex flex-col gap-3">
				<div class="p-5 rounded-lg bg-muted">
					<UFormField label="Display" :ui="{ container: 'flex gap-2 justify-center', hint: 'mr-auto leading-0' }">
						<template #hint>
							<UPopover mode="hover" :delay-duration="100" class="cursor-help"
								:ui="{ content: 'bg-default text-highlighted shadow-sm rounded-sm ring ring-default px-2.5 py-1 text-xs/5' }">
								<UIcon name="i-lucide-circle-question-mark" />
								<template #content>
									<strong>All seasons:</strong> Display all related content (seasons, TV, OVA, etc.) of the anime
									<br />
									<strong>Franchise: </strong> Display only the first content of the anime to represent the franchise
								</template>
							</UPopover>
						</template>
						<div class="w-32 h-fit">
							<input type="radio" id="allSeasons" v-model.lazy="isFranchise" :value="false"
								class="appearance-none peer" />
							<label for="allSeasons"
								class="relative cursor-pointer peer-checked:ring-2 ring-primary ring-offset-2 size-full grid grid-cols-2 rounded-md overflow-hidden">
								<NuxtImg src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg" />
								<NuxtImg src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21856-gutauxhWAwn6.png" />
								<NuxtImg
									src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx100166-jUCZYbzn2XLw.jpg" />
								<NuxtImg
									src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx104276-SnEowMvesWIE.png" />
								<div
									class="absolute inset-0 z-40 bg-linear-to-t from-0% from-neutral-950/75 via-10% via-neutral-950/50 to-25% to-neutral-950/25" />
								<span class="absolute inset-x-2 bottom-2 font-medium text-white text-center z-50 text-sm">
									All seasons
								</span>
							</label>
						</div>
						<div class="w-32 h-fit">
							<input type="radio" id="franchise" v-model.lazy="isFranchise" :value="true"
								class="appearance-none peer" />
							<label for="franchise"
								class="relative cursor-pointer peer-checked:ring-2 ring-primary ring-offset-2 size-full grid rounded-md overflow-hidden">
								<NuxtImg src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg" />
								<div
									class="absolute inset-0 z-40 bg-linear-to-t from-0% from-neutral-950/75 via-10% via-neutral-950/50 to-25% to-neutral-950/25" />
								<span class="absolute inset-x-2 bottom-2 font-medium text-white text-center z-50 text-sm">
									Franchise
								</span>
							</label>
						</div>
					</UFormField>
				</div>
				<div class="bg-muted rounded-lg p-5">
					<UFormField label="Auto rank" orientation="horizontal" :ui="{ container: 'justify-end', hint: 'leading-0' }">
						<template #hint>
							<UTooltip :delay-duration="100" class="cursor-help"
								:ui="{ content: 'h-fit', text: 'max-w-2xs whitespace-normal' }"
								text="The animes will be ranked depending on the ranges configured for each tiers, or else they will be placed in the unranked tier.">
								<UIcon name="i-lucide-circle-question-mark" />
							</UTooltip>
						</template>
						<USwitch v-model="autoRank" />
					</UFormField>
				</div>
				<div class="bg-muted rounded-lg p-5">
					<UFormField label="Range" orientation="horizontal" :ui="{ wrapper: 'col-span-1', container: 'col-span-2' }">
						<USlider v-model="score" :min="0" :max="100" :step="5" :ui="{ root: 'w-full' }" />
					</UFormField>
				</div>
			</div>
		</template>
		<template #footer="{ close }">
			<UButton label="Cancel" variant="outline" @click="close(); reset()" />
			<UButton label="Submit" @click="handleSubmit(close)" :loading="isLoading" :disabled="isLoading">
				<template #leading>
					<UIcon name="i-lucide-loader-circle" class="animate-spin" v-if="isLoading" />
				</template>
			</UButton>
		</template>
	</UModal>

	<!-- Warning popup for overlapping ranges -->
	<OverlappingRangesWarning v-model:open="showOverlappingWarning" :overlapping-ranges="overlappingRanges"
		:is-loading="isConfirmLoading" @confirm="handleOverlappingConfirm" @cancel="handleOverlappingCancel" />
</template>

<script lang="ts" setup>
const autoRank = ref(false)
const score = ref([0, 100])
const isFranchise = ref(false)

const tierlistStore = useTierlistStore()
const entriesStore = useEntriesStore()

const { isInitialized } = storeToRefs(entriesStore)

const showOverlappingWarning = ref(false)
const overlappingRanges = ref<string[]>([])
const isLoading = ref(false)
const isConfirmLoading = ref(false)
const modalCloseFunction = ref<(() => void) | null>(null)

function handleSubmit(close: () => void) {
	isLoading.value = true
	// Stocker la fonction close pour l'utiliser plus tard
	modalCloseFunction.value = close

	// Pour l'instant, on gère uniquement le mode all seasons
	// TODO: Implémenter le mode franchise plus tard

	// Vérifier si les données sont chargées
	if (!isInitialized.value) {
		console.warn("Entries not initialized yet. Please wait for data to load.")
		return
	}

	// Vérifier les ranges qui se chevauchent si autoRank est activé
	if (autoRank.value) {
		const overlaps = tierlistStore.checkOverlappingRanges()

		if (overlaps.length > 0) {
			overlappingRanges.value = overlaps
			showOverlappingWarning.value = true
			return
		}
	}

	// Pas de chevauchement ou autoRank désactivé, procéder normalement
	performImport(close)
}

function performImport(close: () => void) {
	console.log("Starting import with settings:", { autoRank: autoRank.value, score: score.value })

	// Import direct
	tierlistStore.importAnimesFromEntries(autoRank.value, score.value as [number, number])

	// Fermer le modal et reset seulement après la fin du loading
	setTimeout(() => {
		isLoading.value = false
		close()
		reset()
	}, 500)
}

function handleOverlappingConfirm() {
	// Procéder avec duplication autorisée
	isConfirmLoading.value = true

	console.log("Starting import with duplication:", { autoRank: autoRank.value, score: score.value })

	// Import direct
	tierlistStore.importAnimesFromEntries(autoRank.value, score.value as [number, number], true)

	// Fermer le modal et reset seulement après la fin du loading
	setTimeout(() => {
		isConfirmLoading.value = false
		showOverlappingWarning.value = false

		// Fermer le modal et reset en utilisant la fonction stockée
		if (modalCloseFunction.value) {
			modalCloseFunction.value()
		}
		reset()
	}, 500)
}

function handleOverlappingCancel() {
	showOverlappingWarning.value = false
}

function reset() {
	setTimeout(() => {
		autoRank.value = false
		score.value = [0, 100]
		isFranchise.value = false
	}, 200)
}
</script>

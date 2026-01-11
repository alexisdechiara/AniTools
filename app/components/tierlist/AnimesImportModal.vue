<template>
	<UModal v-bind="$attrs" title="Import from AniList" :close="false"
		:ui="{ content: 'max-w-2xl', footer: 'justify-end' }"
		description="Select the settings for importing animes from your lists">
		<template #body>
			<div v-if="isAuthenticated" class="flex flex-col gap-3">
				<div class="grid grid-cols-2 gap-3">
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
											<strong>Franchise: </strong> Display only the first content of the anime to represent the
											franchise
										</template>
									</UPopover>
								</template>
								<div class="w-full h-42">
									<input type="radio" id="allSeasons" v-model.lazy="isFranchise" :value="false"
										class="appearance-none peer" />
									<label for="allSeasons"
										class="relative cursor-pointer peer-checked:ring-2 ring-primary ring-offset-2 size-full grid grid-cols-2 rounded-md overflow-hidden">
										<NuxtImg class="size-full object-cover"
											src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg" />
										<NuxtImg class="size-full object-cover"
											src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21856-gutauxhWAwn6.png" />
										<NuxtImg class="size-full object-cover"
											src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx100166-jUCZYbzn2XLw.jpg" />

										<NuxtImg class="size-full object-cover"
											src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx104276-SnEowMvesWIE.png" />
										<div
											class="absolute inset-0 z-40 bg-linear-to-t from-0% from-neutral-950/75 via-10% via-neutral-950/50 to-25% to-neutral-950/25" />
										<span class="absolute inset-x-2 bottom-2 font-medium text-white text-center z-50 text-sm">
											All seasons
										</span>
									</label>
								</div>
								<div class="w-full h-42">
									<input type="radio" id="franchise" v-model.lazy="isFranchise" :value="true"
										class="appearance-none peer" />
									<label for="franchise"
										class="relative cursor-pointer peer-checked:ring-2 ring-primary ring-offset-2 size-full grid rounded-md overflow-hidden">
										<NuxtImg
											src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg" />
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
							<UFormField label="Auto rank" orientation="horizontal"
								:ui="{ container: 'justify-end', hint: 'leading-0' }">
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
					</div>
					<div class="flex flex-col gap-3">
						<div class="p-5 rounded-lg bg-muted">
							<UFormField label="Filters" :ui="{ container: 'flex gap-2 justify-center', hint: 'mr-auto leading-0' }">
								<div class="flex flex-col gap-y-4 w-full mt-4">
									<USelect v-model="status" multiple :items="['Completed', 'Watching', 'Planning', 'Paused', 'Dropped']"
										placeholder="All status" variant="outline" :ui="{ base: 'w-full' }" />
									<USelectMenu v-model="genres" multiple :items="tierlistGenres" placeholder="All genres"
										variant="outline" :ui="{ base: 'w-full' }" />
									<USelectMenu v-model="years" multiple :items="tierlistYears" value-key="value" placeholder="All years"
										variant="outline" :ui="{ base: 'w-full' }" :disabled="isFranchise" />
									<USelect v-model="seasons" multiple :items="tierlistSeasons" value-key="value"
										placeholder="All seasons" variant="outline" :ui="{ base: 'w-full' }" :disabled="isFranchise" />
									<USelect v-model="formats" multiple :items="tierlistFormats" value-key="value"
										placeholder="All formats" variant="outline" :ui="{ base: 'w-full' }" :disabled="isFranchise" />
								</div>
							</UFormField>
						</div>
					</div>
				</div>
				<div class="bg-muted rounded-lg p-5">
					<UFormField label="Score" orientation="horizontal" :ui="{ root: 'flex items-center gap-6 w-full' }">
						<div class="flex flex-col gap-y-2 w-full">
							<USlider v-model="score" :min="0" :max="100" :step="1" tooltip />
							<div class="flex justify-between">
								<span class="text-xs">0</span>
								<span v-for="i in 10" :key="i" class="text-xs">
									{{ i * 10 }}
								</span>
							</div>
						</div>
					</UFormField>
				</div>
			</div>
			<UEmpty v-else variant="naked" icon="i-lucide-triangle-alert" title="You must be logged in to import animes"
				description="Please sign in with your AniList account to import animes from your lists." />
		</template>
		<template #footer="{ close }">
			<UButton label="Cancel" color="neutral" variant="outline" @click="close(); reset()" />
			<UButton label="Submit" @click="handleSubmit(close)" :loading="isLoading" :disabled="isLoading"
				v-if="isAuthenticated">
				<template #leading>
					<UIcon name="i-lucide-loader-circle" class="animate-spin" v-if="isLoading" />
				</template>
			</UButton>
			<UButton label="Login" variant="solid" color="primary" icon="i-lucide-log-in" v-if="!isAuthenticated"
				:to="{ path: '/login', query: { redirect: router.currentRoute.value.fullPath } }" />
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
const userStore = useUserStore()
const router = useRouter()

const { isInitialized } = storeToRefs(entriesStore)
const { isAuthenticated } = storeToRefs(userStore)


const defaultStatus = ['Completed', 'Watching']


const showOverlappingWarning = ref(false)
const status = ref<string[]>([...defaultStatus])
const genres = ref<string[]>([])
const years = ref<number[]>([])
const seasons = ref<any[]>([])
const formats = ref<any[]>([])
const overlappingRanges = ref<string[]>([])
const isLoading = ref(false)
const isConfirmLoading = ref(false)
const modalCloseFunction = ref<(() => void) | null>(null)

watch(isFranchise, (enabled) => {
	if (enabled) {
		years.value = []
		seasons.value = []
		formats.value = []
	}
})


function handleSubmit(close: () => void) {
	isLoading.value = true
	// Stocker la fonction close pour l'utiliser plus tard
	modalCloseFunction.value = close

	// Pour l'instant, on gère uniquement le mode all seasons
	// TODO: Implémenter le mode franchise plus tard

	// Vérifier si les données sont chargées
	if (!isInitialized.value) {
		console.warn("Entries not initialized yet. Please wait for data to load.")
		isLoading.value = false
		return
	}

	// Vérifier les ranges qui se chevauchent si autoRank est activé
	if (autoRank.value) {
		const overlaps = tierlistStore.checkOverlappingRanges()

		if (overlaps.length > 0) {
			overlappingRanges.value = overlaps
			showOverlappingWarning.value = true
			isLoading.value = false
			return
		}
	}

	// Pas de chevauchement ou autoRank désactivé, procéder normalement
	performImport(close)
}

function performImport(close: () => void) {
	console.log("Starting import with settings:", {
		autoRank: autoRank.value,
		score: score.value,
		status: status.value,
		genres: genres.value,
		years: years.value,
		seasons: seasons.value,
		formats: formats.value
	})

	// Import avec tous les filtres
	tierlistStore.importAnimesFromEntries(
		autoRank.value,
		score.value as [number, number],
		status.value,
		genres.value,
		years.value,
		seasons.value,
		formats.value,
		isFranchise.value
	)

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

	console.log("Starting import with duplication:", {
		autoRank: autoRank.value,
		score: score.value,
		status: status.value,
		genres: genres.value,
		years: years.value,
		seasons: seasons.value,
		formats: formats.value
	})

	// Import avec tous les filtres et duplication
	tierlistStore.importAnimesFromEntries(
		autoRank.value,
		score.value as [number, number],
		status.value,
		genres.value,
		years.value,
		seasons.value,
		formats.value,
		isFranchise.value,
		true
	)

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
		status.value = [...defaultStatus]
		genres.value = []
		years.value = []
		seasons.value = []
		formats.value = []
	}, 200)
}
</script>

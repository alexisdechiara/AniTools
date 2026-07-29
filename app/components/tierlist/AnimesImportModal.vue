<template>
	<UModal
		v-bind="$attrs"
		title="Import from AniList"
		:close="false"
		:ui="{ content: 'max-w-2xl', footer: 'justify-end' }"
		description="Select the settings for importing anime from your lists.">
		<template #body>
			<div v-if="isAuthenticated" class="flex flex-col gap-3">
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
					<div class="flex flex-col gap-3">
						<div class="rounded-lg bg-muted p-5">
							<UFormField
								label="Display"
								:ui="{ container: 'flex gap-2 justify-center', hint: 'mr-auto leading-0' }">
								<template #hint>
									<UPopover
										mode="hover"
										:delay-duration="100"
										class="cursor-help"
										:ui="{ content: 'bg-default text-highlighted shadow-sm rounded-sm ring ring-default px-2.5 py-1 text-xs/5' }">
										<UIcon name="i-lucide-circle-question-mark" />
										<template #content>
											<strong>All seasons:</strong> Display every matching title.
											<br>
											<strong>Franchise:</strong> Keep the earliest matching title in each prequel/sequel chain.
										</template>
									</UPopover>
								</template>
								<div class="h-42 w-full">
									<input
										id="allSeasons"
										v-model.lazy="isFranchise"
										type="radio"
										:value="false"
										class="peer appearance-none">
									<label
										for="allSeasons"
										class="relative grid size-full cursor-pointer grid-cols-2 overflow-hidden rounded-md ring-primary ring-offset-2 peer-checked:ring-2">
										<NuxtImg class="size-full object-cover" src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg" alt="">
										<NuxtImg class="size-full object-cover" src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21856-gutauxhWAwn6.png" alt="">
										<NuxtImg class="size-full object-cover" src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx100166-jUCZYbzn2XLw.jpg" alt="">
										<NuxtImg class="size-full object-cover" src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx104276-SnEowMvesWIE.png" alt="">
										<div class="absolute inset-0 z-40 bg-linear-to-t from-neutral-950/75 from-0% via-neutral-950/50 via-10% to-neutral-950/25 to-25%" />
										<span class="absolute inset-x-2 bottom-2 z-50 text-center text-sm font-medium text-white">
											All seasons
										</span>
									</nuxtimg></nuxtimg></nuxtimg></nuxtimg></label>
								</div>
								<div class="h-42 w-full">
									<input
										id="franchise"
										v-model.lazy="isFranchise"
										type="radio"
										:value="true"
										class="peer appearance-none">
									<label
										for="franchise"
										class="relative grid size-full cursor-pointer overflow-hidden rounded-md ring-primary ring-offset-2 peer-checked:ring-2">
										<NuxtImg src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg" alt="">
										<div class="absolute inset-0 z-40 bg-linear-to-t from-neutral-950/75 from-0% via-neutral-950/50 via-10% to-neutral-950/25 to-25%" />
										<span class="absolute inset-x-2 bottom-2 z-50 text-center text-sm font-medium text-white">
											Franchise
										</span>
									</nuxtimg></label>
								</div>
							</UFormField>
						</div>
						<div class="rounded-lg bg-muted p-5">
							<UFormField
								label="Auto rank"
								orientation="horizontal"
								:ui="{ container: 'justify-end', hint: 'leading-0' }">
								<template #hint>
									<UTooltip
										:delay-duration="100"
										class="cursor-help"
										:ui="{ content: 'h-fit', text: 'max-w-2xs whitespace-normal' }"
										text="Anime are placed according to each tier score range.">
										<UIcon name="i-lucide-circle-question-mark" />
									</UTooltip>
								</template>
								<USwitch v-model="autoRank" />
							</UFormField>
						</div>
					</div>
					<div class="flex flex-col gap-3">
						<div class="rounded-lg bg-muted p-5">
							<UFormField label="Filters">
								<div class="mt-4 flex w-full flex-col gap-y-4">
									<USelect
										v-model="statuses"
										multiple
										:items="statusItems"
										value-key="value"
										placeholder="All statuses"
										variant="outline"
										:ui="{ base: 'w-full' }" />
									<USelectMenu v-model="genres" multiple :items="tierlistGenres" placeholder="All genres" variant="outline" :ui="{ base: 'w-full' }" />
									<USelectMenu v-model="years" multiple :items="tierlistYears" value-key="value" placeholder="All years" variant="outline" :ui="{ base: 'w-full' }" :disabled="isFranchise" />
									<USelect v-model="seasons" multiple :items="tierlistSeasons" value-key="value" placeholder="All seasons" variant="outline" :ui="{ base: 'w-full' }" :disabled="isFranchise" />
									<USelect v-model="formats" multiple :items="tierlistFormats" value-key="value" placeholder="All formats" variant="outline" :ui="{ base: 'w-full' }" :disabled="isFranchise" />
								</div>
							</UFormField>
						</div>
					</div>
				</div>
				<div class="rounded-lg bg-muted p-5">
					<UFormField label="Score" orientation="horizontal" :ui="{ root: 'flex items-center gap-6 w-full' }">
						<div class="flex w-full flex-col gap-y-2">
							<USlider v-model="score" :min="0" :max="100" :step="1" tooltip />
							<div class="flex justify-between">
								<span class="text-xs">0</span>
								<span v-for="value in 10" :key="value" class="text-xs">{{ value * 10 }}</span>
							</div>
						</div>
					</UFormField>
				</div>
			</div>
			<UEmpty
				v-else
				variant="naked"
				icon="i-lucide-triangle-alert"
				title="You must be logged in to import anime"
				description="Sign in with your AniList account to import titles from your lists." />
		</template>
		<template #footer="{ close }">
			<UButton label="Cancel" color="neutral" variant="outline" @click="close(); reset()" />
			<UButton
				v-if="isAuthenticated"
				label="Submit"
				:loading="isLoading"
				:disabled="isLoading || !isInitialized"
				@click="handleSubmit(close)" />
			<UButton
				v-else
				label="Login"
				variant="solid"
				color="primary"
				icon="i-lucide-log-in"
				:to="{ path: '/login', query: { redirect: router.currentRoute.value.fullPath } }" />
		</template>
	</UModal>

	<OverlappingRangesWarning
		v-model:open="showOverlappingWarning"
		:overlapping-ranges="overlappingRanges"
		:is-loading="isConfirmLoading"
		@confirm="handleOverlappingConfirm"
		@cancel="handleOverlappingCancel" />
</template>

<script lang="ts" setup>
import {
	tierlistFormats,
	tierlistGenres,
	tierlistSeasons,
	tierlistYears
} from "~/utils/tierlist-data"

const statusItems = [
	{ label: "Completed", value: "COMPLETED" },
	{ label: "Watching", value: "CURRENT" },
	{ label: "Planning", value: "PLANNING" },
	{ label: "Paused", value: "PAUSED" },
	{ label: "Dropped", value: "DROPPED" }
]
const defaultStatuses = ["COMPLETED", "CURRENT"]

const autoRank = ref(false)
const score = ref<[number, number]>([0, 100])
const isFranchise = ref(false)
const statuses = ref<string[]>([...defaultStatuses])
const genres = ref<string[]>([])
const years = ref<number[]>([])
const seasons = ref<string[]>([])
const formats = ref<string[]>([])
const showOverlappingWarning = ref(false)
const overlappingRanges = ref<string[]>([])
const isLoading = ref(false)
const isConfirmLoading = ref(false)
const modalCloseFunction = ref<(() => void) | null>(null)

const tierlistStore = useTierlistStore()
const entriesStore = useEntriesStore()
const userStore = useUserStore()
const router = useRouter()
const toast = useToast()
const { isInitialized } = storeToRefs(entriesStore)
const { isAuthenticated } = storeToRefs(userStore)

watch(isFranchise, (enabled) => {
	if (!enabled) return
	years.value = []
	seasons.value = []
	formats.value = []
})

function handleSubmit(close: () => void): void {
	if (!isInitialized.value) {
		toast.add({
			title: "AniList data is still loading",
			description: "Wait a moment and try again.",
			color: "warning"
		})
		return
	}
	modalCloseFunction.value = close
	if (autoRank.value) {
		const overlaps = tierlistStore.checkOverlappingRanges()
		if (overlaps.length > 0) {
			overlappingRanges.value = overlaps
			showOverlappingWarning.value = true
			return
		}
	}
	performImport(close, false)
}

function performImport(close: () => void, allowDuplicates: boolean): void {
	isLoading.value = true
	try {
		const result = tierlistStore.importAnimesFromEntries(
			autoRank.value,
			score.value,
			statuses.value,
			genres.value,
			years.value,
			seasons.value,
			formats.value,
			isFranchise.value,
			allowDuplicates
		)
		toast.add({
			title: result.added > 0 ? `${result.added} anime imported` : "No matching anime",
			description: result.truncated
				? "The import was truncated to keep local storage within safe limits."
				: undefined,
			color: result.added > 0 ? "success" : "neutral"
		})
		close()
		reset()
	} finally {
		isLoading.value = false
	}
}

function handleOverlappingConfirm(): void {
	isConfirmLoading.value = true
	try {
		if (modalCloseFunction.value) {
			performImport(modalCloseFunction.value, true)
		}
		showOverlappingWarning.value = false
	} finally {
		isConfirmLoading.value = false
	}
}

function handleOverlappingCancel(): void {
	showOverlappingWarning.value = false
}

function reset(): void {
	autoRank.value = false
	score.value = [0, 100]
	isFranchise.value = false
	statuses.value = [...defaultStatuses]
	genres.value = []
	years.value = []
	seasons.value = []
	formats.value = []
}
</script>

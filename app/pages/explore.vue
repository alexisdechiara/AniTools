<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import type {
	AniListMediaSummary,
	AniListSaveMediaListEntryResponse
} from "~~/shared/types/anilist"
import ExploreInterestedDeck from "~/components/explore/InterestedDeck.vue"
import ExploreSwipeDeck from "~/components/explore/SwipeDeck.vue"
import { getExploreTitle } from "~/utils/explore"

definePageMeta({
	feature: "explore",
	auth: FEATURE_REGISTRY.explore.access,
	indexable: FEATURE_REGISTRY.explore.indexable
})

useSeoMeta({
	title: "Explore anime",
	description: "Swipe through personalized AniList recommendations and discover what to watch next.",
	robots: "noindex, nofollow"
})

type SwipeDirection = "left" | "right"
interface SwipeDecision {
	direction: SwipeDirection
	media: AniListMediaSummary
}

const userStore = useUserStore()
const toast = useToast()
const {
	existingMediaIds,
	seeds,
	studios,
	selectedSeedId,
	selectedStudioId,
	recommendations,
	studioMedia,
	recommendationPageInfo,
	studioPageInfo,
	loadingRecommendations,
	loadingStudio,
	listInitialized,
	recommendationsInitialized,
	studioInitialized,
	listError,
	recommendationError,
	studioError,
	initialize,
	loadRecommendations,
	loadStudio
} = useExplore()

const decidedMediaIds = ref<Set<number>>(new Set())
const interestedMedia = ref<AniListMediaSummary[]>([])
const decisionHistory = ref<SwipeDecision[]>([])
const addedMediaIds = ref<Set<number>>(new Set())
const addingMediaIds = ref<Set<number>>(new Set())
const addingAllToPlanning = ref(false)
const loadingMore = ref(false)

const excludedMediaIds = computed(() => new Set([
	...existingMediaIds.value,
	...addedMediaIds.value
]))
const visibleRecommendations = computed(() => recommendations.value.filter(media =>
	media.isAdult !== true && !excludedMediaIds.value.has(media.id)
))
const visibleStudioMedia = computed(() => studioMedia.value.filter(media =>
	media.isAdult !== true && !excludedMediaIds.value.has(media.id)
))
const selectedSeed = computed(() =>
	seeds.value.find(seed => seed.media.id === selectedSeedId.value)
)
const selectedStudio = computed(() =>
	studios.value.find(studio => studio.id === selectedStudioId.value)
)
const recommendationIds = computed(() =>
	new Set(visibleRecommendations.value.map(media => media.id))
)
const swipeQueue = computed(() => {
	const uniqueMedia = new Map<number, AniListMediaSummary>()
	for (const media of [...visibleRecommendations.value, ...visibleStudioMedia.value]) {
		if (!decidedMediaIds.value.has(media.id)) uniqueMedia.set(media.id, media)
	}
	return [...uniqueMedia.values()]
})
const currentMedia = computed(() => swipeQueue.value[0] ?? null)
const nextMedia = computed(() => swipeQueue.value.slice(1, 3))
const currentReason = computed(() => {
	if (!currentMedia.value) return "Recommended for you"
	if (recommendationIds.value.has(currentMedia.value.id)) {
		return selectedSeed.value
			? `Because you liked ${getExploreTitle(selectedSeed.value.media)}`
			: "Recommended for you"
	}
	return selectedStudio.value
		? `From ${selectedStudio.value.name}`
		: "From a favourite studio"
})
const hasMorePages = computed(() =>
	recommendationPageInfo.value.hasNextPage || studioPageInfo.value.hasNextPage
)
const addingMediaIdList = computed(() => [...addingMediaIds.value])
const { showPageLoader } = useProgressiveLoading(
	computed(() => [
		listInitialized.value,
		recommendationsInitialized.value,
		studioInitialized.value
	]),
	{
		allowPartial: true,
		layoutReady: listInitialized
	}
)

async function loadMoreCandidates(): Promise<void> {
	if (loadingMore.value) return
	loadingMore.value = true

	try {
		const requests: Array<Promise<void>> = []
		if (recommendationPageInfo.value.hasNextPage && !loadingRecommendations.value) {
			requests.push(loadRecommendations(recommendationPageInfo.value.currentPage + 1))
		}
		if (studioPageInfo.value.hasNextPage && !loadingStudio.value) {
			requests.push(loadStudio(studioPageInfo.value.currentPage + 1))
		}
		await Promise.all(requests)
	} finally {
		loadingMore.value = false
	}
}

function handleDecision(payload: SwipeDecision): void {
	decidedMediaIds.value = new Set([...decidedMediaIds.value, payload.media.id])
	decisionHistory.value = [...decisionHistory.value, payload]

	if (payload.direction === "right") {
		interestedMedia.value = [
			...interestedMedia.value.filter(media => media.id !== payload.media.id),
			payload.media
		]
	}

	if (swipeQueue.value.length <= 5 && hasMorePages.value) {
		void loadMoreCandidates()
	}
}

function restoreDecision(media: AniListMediaSummary): void {
	const nextDecidedIds = new Set(decidedMediaIds.value)
	nextDecidedIds.delete(media.id)
	decidedMediaIds.value = nextDecidedIds
	interestedMedia.value = interestedMedia.value.filter(item => item.id !== media.id)
	decisionHistory.value = decisionHistory.value.filter(
		decision => decision.media.id !== media.id
	)
}

function undoLastDecision(): void {
	const previous = decisionHistory.value.at(-1)
	if (!previous) return

	decisionHistory.value = decisionHistory.value.slice(0, -1)
	const nextDecidedIds = new Set(decidedMediaIds.value)
	nextDecidedIds.delete(previous.media.id)
	decidedMediaIds.value = nextDecidedIds
	if (previous.direction === "right") {
		interestedMedia.value = interestedMedia.value.filter(
			media => media.id !== previous.media.id
		)
	}
}

function resetDecisions(): void {
	decidedMediaIds.value = new Set()
	interestedMedia.value = []
	decisionHistory.value = []
}

async function saveToPlanning(
	media: AniListMediaSummary,
	notify = true
): Promise<boolean> {
	if (!userStore.isOAuthAuthenticated || addingMediaIds.value.has(media.id)) return false

	addingMediaIds.value = new Set([...addingMediaIds.value, media.id])
	try {
		await $fetch<AniListSaveMediaListEntryResponse>("/api/anilist/media-list", {
			method: "POST",
			body: { mediaId: media.id }
		})
		addedMediaIds.value = new Set([...addedMediaIds.value, media.id])
		interestedMedia.value = interestedMedia.value.filter(item => item.id !== media.id)
		if (notify) {
			toast.add({
				title: "Added to Plan to Watch",
				description: `${getExploreTitle(media)} is now in your AniList planning list.`,
				color: "warning",
				icon: "i-lucide-bookmark-check"
			})
		}
		return true
	} catch (error) {
		if (notify) {
			toast.add({
				title: "Could not update AniList",
				description: error instanceof Error ? error.message : "Try again in a moment.",
				color: "error",
				icon: "i-lucide-triangle-alert"
			})
		}
		return false
	} finally {
		const nextAddingIds = new Set(addingMediaIds.value)
		nextAddingIds.delete(media.id)
		addingMediaIds.value = nextAddingIds
	}
}

async function addToPlanning(media: AniListMediaSummary): Promise<void> {
	await saveToPlanning(media)
}

async function addAllToPlanning(): Promise<void> {
	if (!userStore.isOAuthAuthenticated || addingAllToPlanning.value) return
	const pendingMedia = [...interestedMedia.value]
	if (!pendingMedia.length) return

	addingAllToPlanning.value = true
	let addedCount = 0
	try {
		for (const media of pendingMedia) {
			if (await saveToPlanning(media, false)) addedCount += 1
		}

		const failedCount = pendingMedia.length - addedCount
		toast.add({
			title: failedCount ? "Plan to Watch partially updated" : "Plan to Watch updated",
			description: failedCount
				? `${addedCount} added, ${failedCount} could not be added.`
				: `${addedCount} ${addedCount === 1 ? "anime was" : "anime were"} added to your AniList planning list.`,
			color: failedCount ? "warning" : "success",
			icon: failedCount ? "i-lucide-triangle-alert" : "i-lucide-bookmark-check"
		})
	} finally {
		addingAllToPlanning.value = false
	}
}

onMounted(() => {
	void initialize()
})
</script>

<template>
	<UDashboardPanel id="explore" :ui="{ body: 'pt-3 sm:pt-4' }">
		<template #body>
			<div class="mx-auto w-full max-w-304 space-y-4">
				<UAlert
					v-if="!showPageLoader && listError"
					icon="i-lucide-triangle-alert"
					title="Discovery data could not be loaded"
					:description="listError"
					color="error"
					variant="soft" />
				<UAlert
					v-else-if="recommendationError || studioError"
					icon="i-lucide-triangle-alert"
					title="Some suggestions could not be loaded"
					:description="recommendationError || studioError || undefined"
					color="warning"
					variant="soft" />

				<PageLoadingState
					v-if="showPageLoader"
					label="Preparing your discovery deck"
					description="Checking your full AniList collection and arranging personalized suggestions." />

				<UEmpty
					v-else-if="!listError && !seeds.length"
					icon="i-lucide-heart-off"
					title="No rated or favourite anime to start from"
					description="Rate or favourite a few anime on AniList, then return here to generate recommendations." />

				<div
					v-else-if="seeds.length"
					class="mx-auto grid w-full items-start justify-center gap-5 lg:grid-cols-[minmax(0,52rem)_22rem]">
					<main class="w-full min-w-0 self-start justify-self-center">
						<ExploreSwipeDeck
							v-if="currentMedia"
							:media="currentMedia"
							:next-media="nextMedia"
							:reason="currentReason"
							@decision="handleDecision" />

						<div
							v-else-if="loadingRecommendations || loadingStudio || loadingMore"
							class="mx-auto w-full max-w-md"
							aria-label="Loading more suggestions"
							aria-busy="true">
							<WidgetLoadingSkeleton label="Loading suggestion" variant="poster" />
						</div>

						<UEmpty
							v-else
							icon="i-lucide-layers-2"
							title="You reached the end of this deck"
							description="Load more suggestions or revisit one of your decisions."
							:actions="[
								...(hasMorePages ? [{
									label: 'Load more',
									icon: 'i-lucide-chevrons-down',
									onClick: loadMoreCandidates
								}] : []),
								{
									label: 'Start over',
									icon: 'i-lucide-rotate-ccw',
									color: 'neutral',
									variant: 'soft',
									onClick: resetDecisions
								}
							]" />
					</main>

					<ExploreInterestedDeck
						class="self-start lg:sticky lg:top-4"
						:media="interestedMedia"
						:can-add-to-planning="userStore.isOAuthAuthenticated"
						:adding-media-ids="addingMediaIdList"
						:adding-all="addingAllToPlanning"
						:undo-disabled="!decisionHistory.length || addingAllToPlanning"
						@add-to-planning="addToPlanning"
						@add-all-to-planning="addAllToPlanning"
						@undo="restoreDecision"
						@undo-last="undoLastDecision" />
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>

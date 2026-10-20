<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import AnimeRankingCard from "~/components/rewind/AnimeRankingCard.vue"
import PodiumCategoryPodiumCard from "~/components/podium/CategoryPodiumCard.vue"
import {
	aggregateEntriesByDimension,
	sortBreakdownItems,
	type StatisticsDimension
} from "~/utils/statistics-breakdown"
import { getEntryWatchMinutes, type StatisticMetric } from "~/utils/statistics"
import type { RewindAnimeMetric } from "~/utils/rewind"

definePageMeta({
	feature: "podium",
	auth: FEATURE_REGISTRY.podium.access,
	indexable: FEATURE_REGISTRY.podium.indexable
})

useSeoMeta({
	title: "Podium",
	description: "The genres, tags, studios and anime that top your AniList list.",
	robots: "noindex, nofollow"
})

type PodiumBoard = "anime" | "genres" | "tags" | "studios"

interface PodiumBoardMeta {
	label: string
	value: PodiumBoard
	icon: string
	description: string
}

const BOARD_META: Record<PodiumBoard, PodiumBoardMeta> = {
	anime: { label: "Anime", value: "anime", icon: "i-lucide-clapperboard", description: "Your highest-rated anime" },
	genres: { label: "Genres", value: "genres", icon: "i-lucide-shapes", description: "Your top genres" },
	tags: { label: "Tags", value: "tags", icon: "i-lucide-tags", description: "Your top tags" },
	studios: { label: "Studios", value: "studios", icon: "i-lucide-building-2", description: "Your top studios" }
}
const boards: PodiumBoardMeta[] = Object.values(BOARD_META)

const board = ref<PodiumBoard>("anime")
const metric = ref<StatisticMetric>("meanScore")
const activeBoard = computed(() => BOARD_META[board.value])

const entriesStore = useEntriesStore()
const userStore = useUserStore()
const { getAllAnimes, loading, error } = storeToRefs(entriesStore)

const hasData = computed(() => getAllAnimes.value.length > 0)
const settled = computed(() =>
	entriesStore.isInitialized || (!loading.value && Boolean(error.value))
)
const { showPageLoader } = useProgressiveLoading(
	computed(() => [settled.value]),
	{ allowPartial: false }
)

const animePodium = computed<RewindAnimeMetric[]>(() =>
	getAllAnimes.value
		.filter(entry => (entry.score ?? 0) > 0)
		.slice(0, 3)
		.map(entry => ({
			entry,
			episodes: entry.progress ?? 0,
			minutesWatched: getEntryWatchMinutes(entry)
		}))
)

const categoryPodium = computed(() => {
	if (board.value === "anime") return []
	const items = aggregateEntriesByDimension(getAllAnimes.value, board.value as StatisticsDimension)
	return sortBreakdownItems(items, metric.value).slice(0, 3)
})

async function load(force = false) {
	await entriesStore.fetchAllAnimes(force)
}

onMounted(() => {
	void load()
})
</script>

<template>
	<UDashboardPanel id="podium">
		<template #body>
			<UContainer class="pb-8 sm:pb-12">
				<UPageHero
					title="Podium"
					:description="userStore.getUsername ? `@${userStore.getUsername}` : 'Sign in to see your podium'"
					:ui="{
						container: 'pt-0 pb-6 sm:pt-0 sm:pb-8 lg:pt-0 lg:pb-10',
						headline: 'w-full justify-center'
					}" />

				<UAlert
					v-if="!showPageLoader && error"
					icon="i-lucide-triangle-alert"
					title="Podium could not be loaded"
					:description="error"
					color="error"
					variant="soft"
					:actions="[{
						label: 'Try again',
						color: 'error',
						variant: 'subtle',
						onClick: () => load(true)
					}]"/>

				<PageLoadingState
					v-if="showPageLoader"
					label="Building your podium"
					description="Ranking your AniList entries by genre, tag, studio and score." />

				<UEmpty
					v-else-if="!hasData && !error"
					icon="i-lucide-trophy"
					title="No podium yet"
					description="Sign in with AniList, or enter a public username, to rank your list."/>

				<template v-else-if="hasData">
					<div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
						<UTabs
							v-model="board"
							:items="boards"
							:content="false"
							color="neutral"
							size="sm"
							aria-label="Podium category"
							:ui="{ trigger: 'cursor-pointer' }" />
					</div>

					<Transition name="podium-swap" mode="out-in">
						<AnimeRankingCard
							v-if="board === 'anime'"
							key="anime"
							title="Top 3 anime"
							:items="animePodium"
							empty-label="No scored anime yet."
							class="mt-6" />
						<MetricsCard
							v-else
							:key="board"
							v-model:sort="metric"
							:title="activeBoard.description"
							enable-sort-select
							:select-items="[
								{ value: 'count', label: 'Most watched' },
								{ value: 'meanScore', label: 'Highest rated' },
								{ value: 'minutesWatched', label: 'Most time spent' }
							]"
							class="mt-6">
							<PodiumCategoryPodiumCard
								:items="categoryPodium"
								:metric="metric"
								:icon="activeBoard.icon"
								:empty-label="`No ${activeBoard.label.toLowerCase()} ranked yet.`" />
						</MetricsCard>
					</Transition>
				</template>
			</UContainer>
		</template>
	</UDashboardPanel>
</template>

<style scoped>
.podium-swap-enter-active,
.podium-swap-leave-active {
	transition: opacity 200ms ease, transform 200ms ease;
}

.podium-swap-enter-from {
	opacity: 0;
	transform: translateY(10px);
}

.podium-swap-leave-to {
	opacity: 0;
	transform: translateY(-6px);
}
</style>

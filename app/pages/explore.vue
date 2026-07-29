<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import {
	filterExploreMedia,
	getExploreTitle
} from "~/utils/explore"

definePageMeta({
	feature: "explore",
	auth: FEATURE_REGISTRY.explore.access,
	indexable: FEATURE_REGISTRY.explore.indexable
})

useSeoMeta({
	title: "Explore anime",
	description: "Discover AniList recommendations and highly rated anime from your favourite studios.",
	robots: "noindex, nofollow"
})

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
	loadingList,
	loadingRecommendations,
	loadingStudio,
	listError,
	recommendationError,
	studioError,
	initialize,
	loadRecommendations,
	loadStudio
} = useExplore()

const genre = ref("")
const format = ref("")
const minimumScore = ref(0)
const allMedia = computed(() => [...recommendations.value, ...studioMedia.value])
const genreOptions = computed(() =>
	[...new Set(allMedia.value.flatMap(media => media.genres))]
		.toSorted((left, right) => left.localeCompare(right))
)
const formatOptions = computed(() =>
	[...new Set(allMedia.value.flatMap(media => media.format ? [media.format] : []))]
		.toSorted((left, right) => left.localeCompare(right))
)
const activeFilters = computed(() => ({
	excludedMediaIds: existingMediaIds.value,
	genre: genre.value || undefined,
	format: format.value || undefined,
	minimumScore: minimumScore.value
}))
const visibleRecommendations = computed(() =>
	filterExploreMedia(recommendations.value, activeFilters.value)
)
const visibleStudioMedia = computed(() =>
	filterExploreMedia(studioMedia.value, activeFilters.value)
)
const selectedSeed = computed(() =>
	seeds.value.find(seed => seed.media.id === selectedSeedId.value)
)
const selectedStudio = computed(() =>
	studios.value.find(studio => studio.id === selectedStudioId.value)
)

onMounted(() => {
	void initialize()
})
</script>

<template>
	<UDashboardPanel id="explore">
		<template #body>
			<div class="mx-auto w-full max-w-7xl space-y-8">
				<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p class="text-sm font-medium text-primary">Personal discovery</p>
						<h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
							Explore anime
						</h1>
						<p class="mt-2 max-w-3xl text-muted">
							Start from your highest-rated titles, then branch into the studios you enjoy most.
							Anime found in the loaded list are hidden from the results.
						</p>
					</div>
					<UButton
						icon="i-lucide-refresh-cw"
						label="Refresh"
						color="neutral"
						variant="soft"
						:loading="loadingList"
						@click="initialize"/>
				</header>

				<UAlert
					v-if="listError"
					icon="i-lucide-triangle-alert"
					title="Discovery data could not be loaded"
					:description="listError"
					color="error"
					variant="soft"/>

				<div
					v-if="loadingList && !seeds.length"
					class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
					aria-label="Loading anime discovery"
					aria-busy="true">
					<USkeleton v-for="index in 6" :key="index" class="aspect-[3/4] rounded-xl" />
				</div>

				<UEmpty
					v-else-if="!listError && !seeds.length"
					icon="i-lucide-heart-off"
					title="No rated or favourite anime to start from"
					description="Rate or favourite a few anime on AniList, then refresh this page to generate recommendations."/>

				<template v-else-if="seeds.length">
					<section
						class="grid gap-4 rounded-xl border border-default bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4"
						aria-label="Discovery filters">
						<label class="space-y-1 text-sm">
							<span class="font-medium text-toned">Genre</span>
							<select
								v-model="genre"
								class="h-10 w-full rounded-md border border-default bg-default px-3 text-highlighted focus-visible:outline-2 focus-visible:outline-primary">
								<option value="">All genres</option>
								<option v-for="option in genreOptions" :key="option" :value="option">
									{{ option }}
								</option>
							</select>
						</label>
						<label class="space-y-1 text-sm">
							<span class="font-medium text-toned">Format</span>
							<select
								v-model="format"
								class="h-10 w-full rounded-md border border-default bg-default px-3 text-highlighted focus-visible:outline-2 focus-visible:outline-primary">
								<option value="">All formats</option>
								<option v-for="option in formatOptions" :key="option" :value="option">
									{{ option.replaceAll("_", " ") }}
								</option>
							</select>
						</label>
						<label class="space-y-1 text-sm">
							<span class="font-medium text-toned">Minimum AniList score</span>
							<select
								v-model.number="minimumScore"
								class="h-10 w-full rounded-md border border-default bg-default px-3 text-highlighted focus-visible:outline-2 focus-visible:outline-primary">
								<option :value="0">Any score</option>
								<option :value="60">60% or higher</option>
								<option :value="70">70% or higher</option>
								<option :value="80">80% or higher</option>
							</select>
						</label>
						<div class="flex items-end">
							<UButton
								icon="i-lucide-list-filter"
								:label="`${visibleRecommendations.length + visibleStudioMedia.length} visible results`"
								color="neutral"
								variant="ghost"
								disabled
								class="w-full justify-center"/>
						</div>
					</section>

					<section class="space-y-4" aria-labelledby="recommendations-title">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<h2 id="recommendations-title" class="text-2xl font-semibold text-highlighted">
									Because you liked
									<span class="text-primary">{{ selectedSeed ? getExploreTitle(selectedSeed.media) : "" }}</span>
								</h2>
								<p class="text-sm text-muted">
									AniList community recommendations, ordered by recommendation rating.
								</p>
							</div>
							<label class="space-y-1 text-sm">
								<span class="sr-only">Recommendation source anime</span>
								<select
									v-model.number="selectedSeedId"
									class="h-10 max-w-full rounded-md border border-default bg-default px-3 text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
									@change="loadRecommendations(1)">
									<option
										v-for="seed in seeds"
										:key="seed.media.id"
										:value="seed.media.id">
										{{ getExploreTitle(seed.media) }} · {{ seed.score || "Favourite" }}
									</option>
								</select>
							</label>
						</div>

						<UAlert
							v-if="recommendationError"
							title="Recommendations could not be loaded"
							:description="recommendationError"
							color="error"
							variant="soft"/>
						<div
							v-if="loadingRecommendations"
							class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
							aria-label="Loading recommendations"
							aria-busy="true">
							<USkeleton v-for="index in 6" :key="index" class="aspect-[3/4] rounded-xl" />
						</div>
						<div
							v-else-if="visibleRecommendations.length"
							class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
							<ExploreMediaCard
								v-for="media in visibleRecommendations"
								:key="media.id"
								:media="media"/>
						</div>
						<UEmpty
							v-else-if="!recommendationError"
							icon="i-lucide-search-x"
							title="No recommendations match"
							description="Try another source anime, relax the filters or continue to the next page."/>
						<div class="flex items-center justify-center gap-3">
							<UButton
								icon="i-lucide-chevron-left"
								label="Previous"
								color="neutral"
								variant="soft"
								:disabled="recommendationPageInfo.currentPage <= 1 || loadingRecommendations"
								@click="loadRecommendations(recommendationPageInfo.currentPage - 1)"/>
							<span class="text-sm text-muted">
								Page {{ recommendationPageInfo.currentPage }}
								<span v-if="recommendationPageInfo.lastPage">
									of {{ recommendationPageInfo.lastPage }}
								</span>
							</span>
							<UButton
								trailing-icon="i-lucide-chevron-right"
								label="Next"
								color="neutral"
								variant="soft"
								:disabled="!recommendationPageInfo.hasNextPage || loadingRecommendations"
								@click="loadRecommendations(recommendationPageInfo.currentPage + 1)"/>
						</div>
					</section>

					<section class="space-y-4" aria-labelledby="studio-title">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<h2 id="studio-title" class="text-2xl font-semibold text-highlighted">
									More from {{ selectedStudio?.name || "your favourite studios" }}
								</h2>
								<p class="text-sm text-muted">
									Main studio credits, ordered by AniList score and popularity.
								</p>
							</div>
							<label class="space-y-1 text-sm">
								<span class="sr-only">Studio</span>
								<select
									v-model.number="selectedStudioId"
									class="h-10 max-w-full rounded-md border border-default bg-default px-3 text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
									@change="loadStudio(1)">
									<option v-for="studio in studios" :key="studio.id" :value="studio.id">
										{{ studio.name }} · {{ studio.count }} liked
									</option>
								</select>
							</label>
						</div>

						<UAlert
							v-if="studioError"
							title="Studio anime could not be loaded"
							:description="studioError"
							color="error"
							variant="soft"/>
						<div
							v-if="loadingStudio"
							class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
							aria-label="Loading studio anime"
							aria-busy="true">
							<USkeleton v-for="index in 6" :key="index" class="aspect-[3/4] rounded-xl" />
						</div>
						<div
							v-else-if="visibleStudioMedia.length"
							class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
							<ExploreMediaCard
								v-for="media in visibleStudioMedia"
								:key="media.id"
								:media="media"/>
						</div>
						<UEmpty
							v-else-if="!studioError"
							icon="i-lucide-building-2"
							title="No studio titles match"
							description="Choose another studio, relax the filters or continue to the next page."/>
						<div class="flex items-center justify-center gap-3">
							<UButton
								icon="i-lucide-chevron-left"
								label="Previous"
								color="neutral"
								variant="soft"
								:disabled="studioPageInfo.currentPage <= 1 || loadingStudio"
								@click="loadStudio(studioPageInfo.currentPage - 1)"/>
							<span class="text-sm text-muted">
								Page {{ studioPageInfo.currentPage }}
								<span v-if="studioPageInfo.lastPage">of {{ studioPageInfo.lastPage }}</span>
							</span>
							<UButton
								trailing-icon="i-lucide-chevron-right"
								label="Next"
								color="neutral"
								variant="soft"
								:disabled="!studioPageInfo.hasNextPage || loadingStudio"
								@click="loadStudio(studioPageInfo.currentPage + 1)"/>
						</div>
					</section>
				</template>
			</div>
		</template>
	</UDashboardPanel>
</template>

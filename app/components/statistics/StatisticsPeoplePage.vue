<script setup lang="ts">
import StatisticsMediaStrip from "~/components/statistics/StatisticsMediaStrip.vue"
import StatisticsPageShell from "~/components/statistics/StatisticsPageShell.vue"
import {
	filterAndSortPeopleStatistics,
	getAniListStaffUrl,
	mapStaffStatistics,
	mapVoiceActorStatistics,
	type StatisticsPeopleKind,
	type StatisticsPeopleMetric
} from "~/utils/statistics-people"

const props = defineProps<{
	pageId: string
	kind: StatisticsPeopleKind
}>()

const statisticsStore = useStatisticsStore()
const { staff, voiceActors } = storeToRefs(statisticsStore)
const selectedMetric = ref<StatisticsPeopleMetric>("count")
const search = ref("")
const metricOptions = [
	{ label: "Count", value: "count", icon: "i-lucide-list-ordered" },
	{ label: "Mean score", value: "meanScore", icon: "i-lucide-percent" },
	{ label: "Time watched", value: "minutesWatched", icon: "i-lucide-clock-3" }
]
const items = computed(() =>
	props.kind === "voiceActors"
		? mapVoiceActorStatistics(voiceActors.value ?? [])
		: mapStaffStatistics(staff.value ?? [])
)
const visibleItems = computed(() =>
	filterAndSortPeopleStatistics(items.value, selectedMetric.value, search.value)
)
</script>

<template>
	<StatisticsPageShell
		:page-id="pageId">
		<div class="space-y-4">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-center">
				<UInput
					v-model="search"
					icon="i-lucide-search"
					:placeholder="kind === 'voiceActors' ? 'Filter voice actors' : 'Filter staff'"
					:aria-label="kind === 'voiceActors' ? 'Filter voice actors' : 'Filter staff'"
					class="w-full sm:max-w-xs"/>
				<UTabs
					v-model="selectedMetric"
					:items="metricOptions"
					:content="false"
					aria-label="Rank people by"
					class="w-full lg:ml-auto lg:w-fit"
					:ui="{ trigger: 'cursor-pointer' }"/>
			</div>

			<div
				v-if="visibleItems.length"
				class="grid gap-4">
				<article
					v-for="(item, index) in visibleItems"
					:key="item.id"
					class="overflow-hidden rounded-xl border border-default bg-elevated shadow-sm transition hover:border-primary/40 hover:shadow-md">
					<div class="p-4 sm:p-5">
						<div class="flex gap-3 sm:gap-4">
							<NuxtLink
								:to="getAniListStaffUrl(item.id)"
								external
								target="_blank"
								rel="noopener noreferrer"
								class="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-32 sm:w-24"
								:aria-label="`Open ${item.name} on AniList`">
								<NuxtImg
									v-if="item.imageUrl"
									:src="item.imageUrl"
									:alt="`${item.name} portrait`"
									width="128"
									height="192"
									loading="lazy"
									class="size-full object-cover"/>
								<span
									v-else
									class="flex size-full items-center justify-center"
									aria-hidden="true">
									<UIcon name="i-lucide-user-round" class="size-6 text-muted"/>
								</span>
							</NuxtLink>

							<div class="min-w-0 flex-1">
								<header class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<NuxtLink
											:to="getAniListStaffUrl(item.id)"
											external
											target="_blank"
											rel="noopener noreferrer"
											class="line-clamp-2 text-lg font-semibold text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary sm:text-xl">
											{{ item.name }}
										</NuxtLink>
										<p
											v-if="item.nativeName && item.nativeName !== item.name"
											class="truncate text-xs text-muted">
											{{ item.nativeName }}
										</p>
									</div>
									<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-inverted shadow-sm">
										{{ index + 1 }}
									</span>
								</header>

								<div class="mt-3 flex flex-wrap gap-1">
									<UBadge
										v-if="item.language"
										:label="item.language"
										color="primary"
										variant="soft"
										size="sm"/>
									<UBadge
										v-if="item.characterCount !== null"
										:label="`${item.characterCount} ${item.characterCount === 1 ? 'character' : 'characters'}`"
										color="neutral"
										variant="soft"
										size="sm"/>
									<UBadge
										v-for="occupation in item.occupations.slice(0, 2)"
										:key="occupation"
										:label="occupation"
										color="neutral"
										variant="soft"
										size="sm"/>
								</div>
								<dl class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
									<div
										class="rounded-lg px-2.5 py-2"
										:class="selectedMetric === 'count' ? 'bg-primary/10' : 'bg-muted/40'">
										<dt class="text-xs text-muted">Count</dt>
										<dd class="mt-0.5 font-semibold text-highlighted tabular-nums">{{ item.count.toLocaleString() }}</dd>
									</div>
									<div
										class="rounded-lg px-2.5 py-2"
										:class="selectedMetric === 'meanScore' ? 'bg-primary/10' : 'bg-muted/40'">
										<dt class="text-xs text-muted">Mean score</dt>
										<dd class="mt-0.5 font-semibold text-highlighted tabular-nums">{{ Number(item.meanScore.toFixed(2)) }}%</dd>
									</div>
									<div
										class="rounded-lg px-2.5 py-2"
										:class="selectedMetric === 'minutesWatched' ? 'bg-primary/10' : 'bg-muted/40'">
										<dt class="text-xs text-muted">Time watched</dt>
										<dd class="mt-0.5 font-semibold text-highlighted tabular-nums">{{ formatWatchTime(item.minutesWatched) }}</dd>
									</div>
								</dl>
							</div>
						</div>
					</div>

					<StatisticsMediaStrip :media-ids="item.mediaIds" :limit="10"/>
				</article>
			</div>

			<p
				v-if="visibleItems.length"
				class="text-center text-xs text-muted">
				AniList returns up to 100 people ordered by title count. Other rankings are sorted locally within that set.
			</p>

			<UEmpty
				v-else
				icon="i-lucide-users-round"
				:title="search ? 'No matching people' : 'No people statistics available'"
				:description="search
					? 'Try a different name, language or occupation.'
					: 'AniList did not return this all-time statistic for the selected profile.'"/>
		</div>
	</StatisticsPageShell>
</template>

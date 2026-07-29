<script setup lang="ts">
import {
	filterAndSortPeopleStatistics,
	getAniListStaffUrl,
	mapStaffStatistics,
	mapVoiceActorStatistics,
	type StatisticsPeopleKind,
	type StatisticsPeopleMetric,
	type StatisticsPersonItem
} from "~/utils/statistics-people"

const props = defineProps<{
	pageId: string
	title: string
	description: string
	kind: StatisticsPeopleKind
}>()

const statisticsStore = useStatisticsStore()
const { staff, voiceActors } = storeToRefs(statisticsStore)
const selectedMetric = ref<StatisticsPeopleMetric>("count")
const search = ref("")
const metricOptions = [
	{ label: "Titles", value: "count" },
	{ label: "Mean score", value: "meanScore" },
	{ label: "Watch time", value: "minutesWatched" }
]
const items = computed(() =>
	props.kind === "voiceActors"
		? mapVoiceActorStatistics(voiceActors.value ?? [])
		: mapStaffStatistics(staff.value ?? [])
)
const visibleItems = computed(() =>
	filterAndSortPeopleStatistics(items.value, selectedMetric.value, search.value)
)
const maxMetric = computed(() =>
	Math.max(0, ...visibleItems.value.map(item => item[selectedMetric.value]))
)

function formatMetric(item: StatisticsPersonItem): string {
	if (selectedMetric.value === "meanScore") {
		return `${Number(item.meanScore.toFixed(2))}%`
	}
	if (selectedMetric.value === "minutesWatched") {
		return formatWatchTime(item.minutesWatched)
	}

	return item.count.toLocaleString()
}

function progressValue(item: StatisticsPersonItem) {
	if (maxMetric.value <= 0) return 0
	return Math.round((item[selectedMetric.value] / maxMetric.value) * 100)
}
</script>

<template>
	<StatisticsPageShell
		:page-id="pageId"
		:title="title"
		:description="description"
		:load-entries="false">
		<div class="space-y-4">
			<UAlert
				icon="i-lucide-info"
				title="All-time AniList ranking"
				description="AniList returns the top 100 people ordered by title count. Other metric sorts are applied locally within that bounded set."
				color="neutral"
				variant="soft"/>

			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<UInput
					v-model="search"
					icon="i-lucide-search"
					:placeholder="kind === 'voiceActors' ? 'Filter voice actors' : 'Filter staff'"
					:aria-label="kind === 'voiceActors' ? 'Filter voice actors' : 'Filter staff'"
					class="w-full sm:max-w-xs"/>
				<USelect
					v-model="selectedMetric"
					:items="metricOptions"
					aria-label="People statistic metric"
					class="w-full sm:ml-auto sm:w-44"/>
			</div>

			<div
				v-if="visibleItems.length"
				class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				<article
					v-for="(item, index) in visibleItems"
					:key="item.id"
					class="rounded-xl border border-default bg-elevated p-4">
					<div class="flex gap-3">
						<NuxtLink
							:to="getAniListStaffUrl(item.id)"
							external
							target="_blank"
							rel="noopener noreferrer"
							class="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
							<div class="flex items-start gap-2">
								<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
									{{ index + 1 }}
								</span>
								<div class="min-w-0 flex-1">
									<NuxtLink
										:to="getAniListStaffUrl(item.id)"
										external
										target="_blank"
										rel="noopener noreferrer"
										class="line-clamp-2 text-sm font-semibold text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
										{{ item.name }}
									</NuxtLink>
									<p
										v-if="item.nativeName && item.nativeName !== item.name"
										class="truncate text-xs text-muted">
										{{ item.nativeName }}
									</p>
								</div>
								<span class="shrink-0 text-sm font-semibold text-highlighted tabular-nums">
									{{ formatMetric(item) }}
								</span>
							</div>

							<UProgress
								:model-value="progressValue(item)"
								:max="100"
								size="sm"
								class="mt-3"
								:aria-label="`${item.name}: ${formatMetric(item)}`"/>
							<div class="mt-2 flex flex-wrap gap-1">
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
						</div>
					</div>

					<div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-default pt-3 text-xs text-muted">
						<span>{{ item.count.toLocaleString() }} titles</span>
						<span>{{ Number(item.meanScore.toFixed(2)) }}% mean</span>
						<span>{{ formatWatchTime(item.minutesWatched) }}</span>
					</div>
				</article>
			</div>

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

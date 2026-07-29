<script setup lang="ts">
import { FEATURE_REGISTRY, type FeatureId } from "#shared/config/features"

const props = withDefaults(defineProps<{
	pageId: string
	title: string
	description: string
	loadData?: boolean
	loadEntries?: boolean
}>(), {
	loadData: true,
	loadEntries: true
})

const entriesStore = useEntriesStore()
const statisticsStore = useStatisticsStore()
const { load, loading, error } = useAniListOverviewData()

const navigationIds = [
	"statistics-overview",
	"statistics-genres",
	"statistics-tags",
	"statistics-studios",
	"statistics-voice-actors",
	"statistics-staff"
] as const satisfies readonly FeatureId[]

const navigationItems = navigationIds.map(id => ({
	id,
	...FEATURE_REGISTRY[id]
}))
const hasData = computed(() =>
	props.loadEntries
		? entriesStore.isInitialized || statisticsStore.isInitialized
		: statisticsStore.isInitialized
)
const pageLoading = computed(() =>
	props.loadEntries ? loading.value : statisticsStore.loading
)
const pageError = computed(() =>
	props.loadEntries ? error.value : statisticsStore.error
)

async function retry() {
	if (props.loadEntries) {
		await load(true)
	} else {
		await statisticsStore.fetchStatistics(true)
	}
}

onMounted(() => {
	if (!props.loadData) return
	if (props.loadEntries) {
		void load()
	} else {
		void statisticsStore.fetchStatistics()
	}
})
</script>

<template>
	<UDashboardPanel :id="pageId">
		<template #body>
			<div class="space-y-6">
				<header>
					<p class="text-sm font-medium text-primary">
						AniList statistics
					</p>
					<h1 class="text-3xl font-semibold tracking-tight text-highlighted">
						{{ title }}
					</h1>
					<p class="mt-1 max-w-3xl text-sm text-muted sm:text-base">
						{{ description }}
					</p>
				</header>

				<nav
					class="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-default bg-muted/30 p-1"
					aria-label="Statistics views">
					<UButton
						v-for="item in navigationItems"
						:key="item.id"
						:to="item.path"
						:icon="item.icon"
						:label="item.label"
						color="neutral"
						:variant="$route.path === item.path ? 'soft' : 'ghost'"
						class="shrink-0"/>
				</nav>

				<UAlert
					v-if="loadData && pageError"
					icon="i-lucide-triangle-alert"
					title="Statistics could not be fully loaded"
					:description="pageError"
					color="error"
					variant="soft"
					:actions="[{
						label: 'Try again',
						color: 'error',
						variant: 'subtle',
						onClick: retry
					}]"/>

				<div
					v-if="loadData && pageLoading && !hasData"
					class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
					aria-label="Loading statistics"
					aria-busy="true">
					<USkeleton
						v-for="index in 8"
						:key="index"
						class="h-40"/>
				</div>

				<slot v-else />
			</div>
		</template>
	</UDashboardPanel>
</template>

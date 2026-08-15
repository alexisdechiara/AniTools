<script setup lang="ts">
const props = withDefaults(defineProps<{
	allowPartial?: boolean
	pageId: string
	loadData?: boolean
	loadEntries?: boolean
}>(), {
	allowPartial: false,
	loadData: true,
	loadEntries: true
})

const entriesStore = useEntriesStore()
const statisticsStore = useStatisticsStore()
const { load, error } = useAniListOverviewData()

const entriesSettled = computed(() =>
	entriesStore.isInitialized
	|| (!entriesStore.loading && Boolean(entriesStore.error))
)
const statisticsSettled = computed(() =>
	statisticsStore.isInitialized
	|| (!statisticsStore.loading && Boolean(statisticsStore.error))
)
const pageError = computed(() =>
	props.loadEntries ? error.value : statisticsStore.error
)
const readyStates = computed(() => props.loadEntries
	? [entriesSettled.value, statisticsSettled.value]
	: [statisticsSettled.value]
)
const { showPageLoader } = useProgressiveLoading(readyStates, {
	allowPartial: props.allowPartial
})
const entriesPending = computed(() => props.loadEntries && !entriesSettled.value)
const statisticsPending = computed(() => !statisticsSettled.value)

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

				<Transition name="statistics-ready" mode="out-in">
					<PageLoadingState
						v-if="loadData && showPageLoader"
						key="statistics-loading"
						label="Preparing your statistics"
						description="Calculating your AniList overview and arranging every widget." />
					<div v-else key="statistics-content">
						<slot
							:entries-loading="entriesPending"
							:statistics-loading="statisticsPending" />
					</div>
				</Transition>
			</div>
		</template>
	</UDashboardPanel>
</template>

<style scoped>
.statistics-ready-enter-active,
.statistics-ready-leave-active {
	transition: opacity 220ms ease, transform 220ms ease;
}

.statistics-ready-enter-from,
.statistics-ready-leave-to {
	opacity: 0;
	transform: translateY(5px);
}

@media (prefers-reduced-motion: reduce) {
	.statistics-ready-enter-active,
	.statistics-ready-leave-active {
		transition: none;
	}
}
</style>

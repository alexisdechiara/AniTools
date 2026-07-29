<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import type { DashboardCardId } from "~/config/components"
import type { RecentListUpdate } from "~/types/dashboard"

definePageMeta({
	feature: "dashboard",
	auth: FEATURE_REGISTRY.dashboard.access,
	indexable: FEATURE_REGISTRY.dashboard.indexable
})

const userStore = useUserStore()
const entriesStore = useEntriesStore()
const statisticsStore = useStatisticsStore()
const { getAllAnimes } = storeToRefs(entriesStore)
const { load, loading, error } = useAniListOverviewData()
const {
	cardIds,
	cards,
	availableCards,
	add,
	remove,
	move,
	reset
} = useDashboardCards()
const addCardModalOpen = ref(false)

const hasData = computed(() =>
	entriesStore.isInitialized || statisticsStore.isInitialized
)
const recentUpdates = computed<RecentListUpdate[]>(() =>
	getAllAnimes.value
		.filter(entry => Boolean(entry.updatedAt && entry.media))
		.toSorted((left, right) =>
			(right.updatedAt ?? 0) - (left.updatedAt ?? 0)
		)
		.slice(0, 8)
		.map(entry => ({
			id: entry.id,
			title: entry.media?.title?.userPreferred
				?? entry.media?.title?.english
				?? entry.media?.title?.romaji
				?? "Untitled anime",
			status: entry.status ?? "UNKNOWN",
			updatedAt: entry.updatedAt ?? 0,
			coverImage: entry.media?.coverImage?.medium
		}))
)

function cardProps(cardId: DashboardCardId): Record<string, unknown> {
	if (cardId === "recent-updates") {
		return { items: recentUpdates.value }
	}

	if (cardId === "next-episodes") {
		return { showViewMore: true }
	}

	return {}
}

async function retry() {
	await load(true)
}

onMounted(() => {
	void load()
})
</script>

<template>
	<UDashboardPanel id="home">
		<template #body>
			<div class="space-y-6">
				<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p class="text-sm font-medium text-primary">
							Personal dashboard
						</p>
						<h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
							Welcome back, {{ userStore.getUsername }}
						</h1>
						<p class="mt-1 text-base text-muted">
							Your AniList summary, upcoming episodes and latest list changes.
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<UButton
							icon="i-lucide-rotate-ccw"
							label="Reset cards"
							color="neutral"
							variant="ghost"
							@click="reset"/>
						<UModal
							v-model:open="addCardModalOpen"
							title="Add a dashboard card"
							description="Card choices are saved only in this browser.">
							<UButton
								icon="i-lucide-plus"
								label="Add a card"
								:disabled="availableCards.length === 0"/>
							<template #body>
								<div
									v-if="availableCards.length"
									class="grid gap-3 sm:grid-cols-2">
									<button
										v-for="card in availableCards"
										:key="card.id"
										type="button"
										class="flex rounded-lg border border-default p-4 text-left transition hover:border-primary hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
										@click="add(card.id); addCardModalOpen = false">
										<UIcon
											:name="card.icon"
											class="mt-0.5 mr-3 size-5 shrink-0 text-primary"/>
										<span>
											<span class="block text-sm font-medium text-highlighted">
												{{ card.label }}
											</span>
											<span class="mt-1 block text-xs text-muted">
												{{ card.description }}
											</span>
										</span>
									</button>
								</div>
								<UAlert
									v-else
									icon="i-lucide-circle-check"
									title="Every card is already visible"
									description="Remove a card first if you want to reorganize the dashboard."
									color="success"
									variant="soft"/>
							</template>
						</UModal>
					</div>
				</header>

				<UAlert
					v-if="error"
					icon="i-lucide-triangle-alert"
					title="Some dashboard data could not be loaded"
					:description="error"
					color="error"
					variant="soft"
					:actions="[{
						label: 'Try again',
						color: 'error',
						variant: 'subtle',
						onClick: retry
					}]"/>

				<div
					v-if="loading && !hasData"
					class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12"
					aria-label="Loading dashboard"
					aria-busy="true">
					<USkeleton
						v-for="index in 8"
						:key="index"
						class="h-40 sm:col-span-1 xl:col-span-3"/>
				</div>

				<div
					v-else-if="cardIds.length"
					class="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-12">
					<section
						v-for="(card, index) in cards"
						:key="card.id"
						:class="[card.gridClass, card.minHeightClass]"
						class="group/card relative flex flex-col"
						:aria-label="card.label">
						<div class="mb-1 flex min-h-8 items-center justify-end gap-1 opacity-60 transition group-focus-within/card:opacity-100 group-hover/card:opacity-100">
							<UButton
								icon="i-lucide-arrow-left"
								color="neutral"
								variant="ghost"
								size="xs"
								:aria-label="`Move ${card.label} earlier`"
								:disabled="index === 0"
								@click="move(card.id, -1)"/>
							<UButton
								icon="i-lucide-arrow-right"
								color="neutral"
								variant="ghost"
								size="xs"
								:aria-label="`Move ${card.label} later`"
								:disabled="index === cards.length - 1"
								@click="move(card.id, 1)"/>
							<UButton
								icon="i-lucide-x"
								color="neutral"
								variant="ghost"
								size="xs"
								:aria-label="`Remove ${card.label}`"
								@click="remove(card.id)"/>
						</div>
						<component
							:is="card.component"
							v-bind="cardProps(card.id)"
							class="min-h-0 flex-1"/>
					</section>
				</div>

				<UAlert
					v-else
					icon="i-lucide-layout-dashboard"
					title="Your dashboard is empty"
					description="Add a card to rebuild a dashboard that fits your needs."
					color="neutral"
					variant="soft"
					:actions="[{
						label: 'Add a card',
						onClick: () => { addCardModalOpen = true }
					}]"/>
			</div>
		</template>
	</UDashboardPanel>
</template>

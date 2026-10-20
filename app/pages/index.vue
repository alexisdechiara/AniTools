<script setup lang="ts">
import type { CSSProperties } from "vue"
import { GridItem, GridLayout, type LayoutItem } from "grid-layout-plus"
import { FEATURE_REGISTRY } from "#shared/config/features"
import DashboardDeleteDropTarget from "~/components/dashboard/DeleteDropTarget.vue"
import {
	DASHBOARD_CARDS,
	getDashboardCard,
	type DashboardCardGroup,
	type DashboardCardId
} from "~/config/components"
import type { RecentListUpdate } from "~/types/dashboard"
import {
	DASHBOARD_GRID_COLUMNS,
	type DashboardGridBreakpoint,
	getDashboardDeleteAttractionOffset,
	isDashboardCardId,
	isDashboardDeleteTargetHit,
	packDashboardLayout
} from "~/utils/dashboard-layout"

definePageMeta({
	feature: "dashboard",
	auth: FEATURE_REGISTRY.dashboard.access,
	indexable: FEATURE_REGISTRY.dashboard.indexable
})

const userStore = useUserStore()
const entriesStore = useEntriesStore()
const statisticsStore = useStatisticsStore()
const { getAllAnimes } = storeToRefs(entriesStore)
const { load, error } = useAniListOverviewData()
const {
	cardIds,
	isHydrated,
	add,
	remove,
	move,
	reorder
} = useDashboardCards()
const addCardModalOpen = ref(false)
const activeDragCardId = ref<DashboardCardId | null>(null)
const deleteTargetActive = ref(false)
const deleteConfirmed = ref(false)
const deleteAttractionOffset = reactive({ x: 0, y: 0 })
let activePointerId: number | null = null
let deleteConfirmationTimer: ReturnType<typeof setTimeout> | null = null

interface DashboardLayoutItem extends LayoutItem {
	i: DashboardCardId
}

const CARD_GROUPS: ReadonlyArray<{
	description: string
	id: DashboardCardGroup
	label: string
}> = [
	{
		id: "dashboard",
		label: "Dashboard",
		description: "Live overview and list activity"
	},
	{
		id: "statistics",
		label: "Statistics",
		description: "All-time AniList statistics"
	},
	{
		id: "rewind",
		label: "Rewind · All time",
		description: "Rewind rankings calculated across your full list"
	}
]

const cardCatalogueGroups = computed(() => CARD_GROUPS.map(group => ({
	...group,
	cards: DASHBOARD_CARDS.filter(card => card.group === group.id)
})))

function cardSizes(ids: readonly DashboardCardId[]) {
	return ids.map(id => ({ id, size: getDashboardCard(id).size }))
}

// The layout handed to the grid must match the active breakpoint: a 12-column layout given to
// the 2-column phone grid is only clamped, not reflowed, and the cards end up stacked on top
// of each other.
const currentBreakpoint = ref<DashboardGridBreakpoint>("lg")

function createDashboardLayout(ids: readonly DashboardCardId[]): DashboardLayoutItem[] {
	return packDashboardLayout(cardSizes(ids), DASHBOARD_GRID_COLUMNS[currentBreakpoint.value])
}

function handleBreakpointChanged(breakpoint: DashboardGridBreakpoint): void {
	currentBreakpoint.value = breakpoint
}

const dashboardLayout = ref<DashboardLayoutItem[]>(
	createDashboardLayout(cardIds.value)
)
// Without a layout per breakpoint, grid-layout-plus squeezes the 12-column one and leaves holes.
const responsiveLayouts = computed(() => {
	const order = dashboardLayout.value
		.toSorted((left, right) => left.y - right.y || left.x - right.x)
		.map(item => item.i)
	const sizes = cardSizes(order)
	// Positions always derive from the card order (dragging reorders the list), so each
	// breakpoint is repacked from it rather than copied from whichever layout is active.
	return {
		lg: packDashboardLayout(sizes, DASHBOARD_GRID_COLUMNS.lg),
		md: packDashboardLayout(sizes, DASHBOARD_GRID_COLUMNS.md),
		sm: packDashboardLayout(sizes, DASHBOARD_GRID_COLUMNS.sm),
		xs: packDashboardLayout(sizes, DASHBOARD_GRID_COLUMNS.xs),
		xxs: packDashboardLayout(sizes, DASHBOARD_GRID_COLUMNS.xxs)
	}
})
const layoutCards = computed(() => dashboardLayout.value.map(item => ({
	item,
	card: getDashboardCard(item.i)
})))

watch(cardIds, (ids) => {
	const currentIds = dashboardLayout.value.map(item => item.i)
	if (
		ids.length === currentIds.length
		&& ids.every((id, index) => id === currentIds[index])
	) return

	dashboardLayout.value = createDashboardLayout(ids)
})

// grid-layout-plus also emits layout-updated on mount and on every reflow. Only a drag the user
// made may change the saved card order; a narrow grid packing cards differently must not.
let reorderOnNextLayoutUpdate = false

function handleLayoutUpdated(nextLayout: LayoutItem[]) {
	if (!reorderOnNextLayoutUpdate) return
	reorderOnNextLayoutUpdate = false

	const visibleIds = new Set(cardIds.value)
	const nextOrder = nextLayout
		.toSorted((left, right) => left.y - right.y || left.x - right.x)
		.map(item => item.i)
		.filter((item): item is DashboardCardId =>
			isDashboardCardId(item) && visibleIds.has(item)
		)

	reorder(nextOrder)
}

const entriesSettled = computed(() =>
	entriesStore.isInitialized
	|| (!entriesStore.loading && Boolean(entriesStore.error))
)
const statisticsSettled = computed(() =>
	statisticsStore.isInitialized
	|| (!statisticsStore.loading && Boolean(statisticsStore.error))
)
const layoutReady = computed(() =>
	isHydrated.value && dashboardLayout.value.length === cardIds.value.length
)
const { showPageLoader } = useProgressiveLoading(
	computed(() => [entriesSettled.value, statisticsSettled.value]),
	{
		allowPartial: true,
		layoutReady
	}
)

function isCardLoading(cardId: DashboardCardId): boolean {
	return getDashboardCard(cardId).loadingSource === "entries"
		? !entriesSettled.value
		: !statisticsSettled.value
}

function cardSkeletonVariant(cardId: DashboardCardId) {
	return getDashboardCard(cardId).skeleton
}
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
		return { items: recentUpdates.value, showViewMore: true }
	}

	if (cardId === "next-episodes") {
		return { showViewMore: true }
	}
	if (cardId === "rewind-seasons") return { variant: "seasons" }
	if (cardId === "rewind-highlights") return { variant: "highlights" }
	if (cardId === "rewind-top-anime") return { variant: "top" }
	if (cardId === "rewind-flop-anime") return { variant: "flop" }

	return {}
}

function isCardAdded(cardId: DashboardCardId): boolean {
	return cardIds.value.includes(cardId)
}

function getDeleteTargetBounds(): DOMRect | null {
	if (!import.meta.client) return null
	return document
		.querySelector<HTMLElement>("[data-dashboard-delete-target]")
		?.getBoundingClientRect() ?? null
}

function getDraggedCardBounds(cardId: DashboardCardId): DOMRect | null {
	if (!import.meta.client) return null
	const cardElement = [...document.querySelectorAll<HTMLElement>(
		"[data-dashboard-card-id]"
	)].find(element => element.dataset.dashboardCardId === cardId)
	return cardElement?.getBoundingClientRect() ?? null
}

function updateDeleteTarget(event: PointerEvent): void {
	if (event.pointerId !== activePointerId || !activeDragCardId.value) return
	const targetBounds = getDeleteTargetBounds()
	const pointerHit = isDashboardDeleteTargetHit(
		{ x: event.clientX, y: event.clientY },
		targetBounds
	)
	const cardBounds = getDraggedCardBounds(activeDragCardId.value)
	const cardCenter = cardBounds
		? {
			x: (cardBounds.left + cardBounds.right) / 2,
			y: (cardBounds.top + cardBounds.bottom) / 2
		}
		: null
	const cardHit = cardCenter
		? isDashboardDeleteTargetHit(cardCenter, targetBounds, 28)
		: false
	const shouldAttract = pointerHit || cardHit
	deleteTargetActive.value = shouldAttract

	if (shouldAttract) {
		const offset = getDashboardDeleteAttractionOffset(cardBounds, targetBounds)
		if (offset) Object.assign(deleteAttractionOffset, offset)
	}
}

function cardAttractionStyle(cardId: DashboardCardId): CSSProperties | undefined {
	if (activeDragCardId.value !== cardId || !deleteTargetActive.value) return undefined

	return {
		"--dashboard-delete-x": `${deleteAttractionOffset.x}px`,
		"--dashboard-delete-y": `${deleteAttractionOffset.y}px`
	} as CSSProperties
}

function cleanupDragListeners(): void {
	if (!import.meta.client) return
	window.removeEventListener("pointermove", updateDeleteTarget)
	window.removeEventListener("pointerup", finishCardDrag)
	window.removeEventListener("pointercancel", cancelCardDrag)
	activePointerId = null
}

function finishCardDrag(event: PointerEvent): void {
	if (event.pointerId !== activePointerId) return
	// The grid reports the dropped layout synchronously during this pointerup; a press on the
	// handle that moved nothing must not leave the next reflow allowed to reorder.
	setTimeout(() => {
		reorderOnNextLayoutUpdate = false
	})
	const cardId = activeDragCardId.value
	const shouldRemove = Boolean(cardId && deleteTargetActive.value)
	cleanupDragListeners()

	if (cardId && shouldRemove) {
		deleteConfirmed.value = true
		remove(cardId)
		if (deleteConfirmationTimer) clearTimeout(deleteConfirmationTimer)
		deleteConfirmationTimer = setTimeout(() => {
			deleteConfirmed.value = false
			activeDragCardId.value = null
		}, 320)
		return
	}

	deleteTargetActive.value = false
	Object.assign(deleteAttractionOffset, { x: 0, y: 0 })
	activeDragCardId.value = null
}

function cancelCardDrag(event: PointerEvent): void {
	if (event.pointerId !== activePointerId) return
	reorderOnNextLayoutUpdate = false
	cleanupDragListeners()
	deleteTargetActive.value = false
	Object.assign(deleteAttractionOffset, { x: 0, y: 0 })
	activeDragCardId.value = null
}

function beginCardDrag(cardId: DashboardCardId, event: PointerEvent): void {
	if (!(event.target as Element).closest("[data-card-drag-handle]")) return
	if (!import.meta.client) return

	cleanupDragListeners()
	reorderOnNextLayoutUpdate = true
	activeDragCardId.value = cardId
	deleteTargetActive.value = false
	deleteConfirmed.value = false
	Object.assign(deleteAttractionOffset, { x: 0, y: 0 })
	activePointerId = event.pointerId
	window.addEventListener("pointermove", updateDeleteTarget)
	window.addEventListener("pointerup", finishCardDrag)
	window.addEventListener("pointercancel", cancelCardDrag)
}

function cardActions(cardId: DashboardCardId, index: number) {
	const card = getDashboardCard(cardId)

	return [
		[
			{
				label: "Move earlier",
				icon: "i-lucide-arrow-left",
				disabled: index === 0,
				onClick: () => move(cardId, -1)
			},
			{
				label: "Move later",
				icon: "i-lucide-arrow-right",
				disabled: index === layoutCards.value.length - 1,
				onClick: () => move(cardId, 1)
			}
		],
		[
			{
				label: `Remove ${card.label}`,
				icon: "i-lucide-trash",
				color: "error" as const,
				onClick: () => remove(cardId)
			}
		]
	]
}

async function retry() {
	await load(true)
}

onMounted(() => {
	void load()
})

onBeforeUnmount(() => {
	cleanupDragListeners()
	if (deleteConfirmationTimer) clearTimeout(deleteConfirmationTimer)
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
						<UModal
							v-model:open="addCardModalOpen"
							title="Dashboard card catalogue"
							description="Add Dashboard, Statistics and all-time Rewind cards. Choices are saved only in this browser."
							:ui="{ content: 'sm:max-w-3xl' }">
							<UButton
								icon="i-lucide-plus"
								label="Add a card" />
							<template #body>
								<div class="max-h-[70vh] space-y-7 overflow-y-auto pr-1">
									<section
										v-for="group in cardCatalogueGroups"
										:key="group.id"
										:aria-labelledby="`card-group-${group.id}`">
										<div class="mb-3 flex items-end justify-between gap-3">
											<div>
												<h3
													:id="`card-group-${group.id}`"
													class="text-sm font-semibold text-highlighted">
													{{ group.label }}
												</h3>
												<p class="mt-0.5 text-xs text-muted">{{ group.description }}</p>
											</div>
											<UBadge
												:label="`${group.cards.length} cards`"
												color="neutral"
												variant="soft" />
										</div>
										<div class="grid gap-3 sm:grid-cols-2">
											<button
												v-for="card in group.cards"
												:key="card.id"
												type="button"
												class="group/catalog-card flex rounded-xl border border-default p-4 text-left transition hover:border-primary hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-60"
												:disabled="isCardAdded(card.id)"
												@click="add(card.id)">
												<span class="mr-3 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover/catalog-card:scale-105">
													<UIcon :name="card.icon" class="size-5" />
												</span>
												<span class="min-w-0 flex-1">
													<span class="flex items-center justify-between gap-2 text-sm font-medium text-highlighted">
														{{ card.label }}
														<UBadge
															v-if="isCardAdded(card.id)"
															label="Added"
															icon="i-lucide-check"
															color="success"
															variant="soft" />
													</span>
													<span class="mt-1 block text-xs text-muted">{{ card.description }}</span>
												</span>
											</button>
										</div>
									</section>
								</div>
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

				<Transition name="dashboard-ready" mode="out-in">
					<PageLoadingState
						v-if="showPageLoader"
						key="page-loading"
						label="Preparing your dashboard"
						description="Loading your AniList summary and restoring your widget layout." />

					<GridLayout
					v-else-if="cardIds.length"
					key="dashboard-grid"
					v-model:layout="dashboardLayout"
					:col-num="12"
					:row-height="104"
					:margin="[16, 16]"
					:is-draggable="true"
					:is-resizable="false"
					:responsive="true"
					:breakpoints="{ lg: 900, md: 700, sm: 500, xs: 320, xxs: 0 }"
					:cols="DASHBOARD_GRID_COLUMNS"
					:responsive-layouts="responsiveLayouts"
					data-dashboard-grid
					@breakpoint-changed="handleBreakpointChanged"
					@layout-updated="handleLayoutUpdated">
					<GridItem
						v-for="({ item, card }, index) in layoutCards"
						:key="card.id"
						:x="item.x"
						:y="item.y"
						:w="item.w"
						:h="item.h"
						:i="item.i"
						:is-resizable="false"
						drag-allow-from="[data-card-drag-handle]"
						drag-ignore-from="a, button:not([data-card-drag-handle])"
						class="group/card"
						:aria-label="card.label"
						:data-dashboard-card-id="card.id"
						:data-drag-source="activeDragCardId === card.id ? '' : undefined"
						@pointerdown.capture="beginCardDrag(card.id, $event)">
						<div
							data-dashboard-card-shell
							:data-delete-attracted="activeDragCardId === card.id && deleteTargetActive ? '' : undefined"
							:style="cardAttractionStyle(card.id)"
							class="size-full">
							<UContextMenu :items="cardActions(card.id, index)" size="sm">
							<WidgetLoadingSkeleton
								v-if="isCardLoading(card.id)"
								:label="`Loading ${card.label}`"
								:variant="cardSkeletonVariant(card.id)" />
							<Suspense v-else>
								<component
									:is="card.component"
									v-bind="cardProps(card.id)"
									draggable
									class="size-full"
									@move="move(card.id, $event)"/>
								<template #fallback>
									<WidgetLoadingSkeleton
										:label="`Loading ${card.label}`"
										:variant="cardSkeletonVariant(card.id)" />
								</template>
							</Suspense>
							</UContextMenu>
						</div>
					</GridItem>
					</GridLayout>

					<UAlert
						v-else
						key="empty-dashboard"
					icon="i-lucide-layout-dashboard"
					title="Your dashboard is empty"
					description="Add a card to rebuild a dashboard that fits your needs."
					color="neutral"
					variant="soft"
					:actions="[{
						label: 'Add a card',
						onClick: () => { addCardModalOpen = true }
						}]"/>
				</Transition>

				<DashboardDeleteDropTarget
					:visible="activeDragCardId !== null || deleteConfirmed"
					:active="deleteTargetActive"
					:confirmed="deleteConfirmed" />
			</div>
		</template>
	</UDashboardPanel>
</template>

<style>
[data-dashboard-grid] .vgl-item__resizer {
	display: none;
}

[data-dashboard-grid] .vgl-item--placeholder {
	border-radius: var(--radius-lg);
	background: var(--ui-bg-elevated);
	opacity: 0.65;
}

[data-dashboard-grid] [data-drag-source] {
	z-index: 80;
}

[data-dashboard-grid] [data-drag-source] [data-dashboard-card-shell],
[data-dashboard-grid] .vgl-item--dragging [data-dashboard-card-shell] {
	transform-origin: 50% 50%;
	animation: dashboard-card-wiggle 145ms ease-in-out infinite alternate;
	filter: drop-shadow(0 22px 26px color-mix(in srgb, black 20%, transparent));
}

[data-dashboard-grid] [data-delete-attracted] {
	pointer-events: none;
	transform-origin: 50% 50%;
	animation: dashboard-card-absorb 240ms cubic-bezier(0.55, 0, 0.85, 0.36) forwards !important;
}

@keyframes dashboard-card-wiggle {
	0% { transform: rotate(-0.7deg) scale(1.012); }
	100% { transform: rotate(0.7deg) scale(1.018); }
}

@keyframes dashboard-card-absorb {
	0% {
		opacity: 1;
		filter: drop-shadow(0 22px 26px color-mix(in srgb, black 20%, transparent));
	}
	72% {
		opacity: 0.72;
	}
	100% {
		opacity: 0;
		filter: drop-shadow(0 0 0 transparent);
		transform:
			translate3d(var(--dashboard-delete-x, 0), var(--dashboard-delete-y, 0), 0)
			rotate(11deg)
			scale(0.035);
	}
}
</style>

<style scoped>
.dashboard-ready-enter-active,
.dashboard-ready-leave-active {
	transition: opacity 220ms ease, transform 220ms ease;
}

.dashboard-ready-enter-from,
.dashboard-ready-leave-to {
	opacity: 0;
	transform: translateY(5px);
}

@media (prefers-reduced-motion: reduce) {
	[data-dashboard-grid] [data-drag-source] [data-dashboard-card-shell],
	[data-dashboard-grid] .vgl-item--dragging [data-dashboard-card-shell] {
		animation: none;
	}

	[data-dashboard-grid] [data-delete-attracted] {
		opacity: 0;
		animation: none !important;
		transform:
			translate3d(var(--dashboard-delete-x, 0), var(--dashboard-delete-y, 0), 0)
			scale(0.035);
	}

	.dashboard-ready-enter-active,
	.dashboard-ready-leave-active {
		transition: none;
	}
}
</style>

<style scoped>
[data-dashboard-grid] {
	--vgl-placeholder-bg: var(--ui-bg-elevated);
	--vgl-placeholder-opacity: 65%;
}
</style>

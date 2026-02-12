<template>
	<UPopover :content="popoverContent" :reference="reference" v-bind="$attrs">
		<slot />
		<template #content>
			<div class="relative overflow-hidden" :class="isHorizontal ? 'h-64 max-w-lg' : 'h-fit max-w-xs'" ref="popoverEl"
				:style="{ '--anime-theme-color': animeThemeColor }">
				<div :class="isHorizontal ? 'grid grid-cols-3 size-full' : 'grid grid-cols-1 size-full'">
					<div v-if="isHorizontal" class="col-span-1 h-full w-fit relative">
						<NuxtPicture :src="data.media.coverImage.large" :imgAttrs="{ class: 'size-full rounded-l-md' }" />
						<div class="absolute bottom-0 inset-x-0 flex py-3 items-center justify-center">
							<UTabs v-if="showTabs" v-model="activeTab" size="xs" :items="items" :content="false" :ui="{
								root: 'opacity-95',
								indicator: `bg-(--anime-theme-color)`,
								trigger:
									'cursor-pointer ring-0! ring-transparent! focus-visible:ring-transparent! focus-visible:ring-0!',
							}" />
						</div>
					</div>
					<div class="col-span-2 justify-center flex flex-col p-4 sm:p-6"
						:class="[isHorizontal ? 'h-64' : 'h-full gap-y-4', showBadges ? 'pb-0 sm:pb-0' : '']">
						<div class="relative flex flex-col gap-y-2 h-full" @mouseover="hoveredContent = true"
							@mouseleave="hoveredContent = false"
							:class="[hoveredContent || isVertical ? 'overflow-y-auto' : 'overflow-y-hidden', isHorizontal ? '' : '']"
							v-if="showSummary" :style="{ 'scrollbar-gutter': isHorizontal ? 'stable' : 'auto' }">
							<div class="flex justify-between items-start">
								<div class="flex w-full flex-col gap-y-0.5">
									<TextHover class="text-xs text-dimmed">
										<template #default>
											<div class="inline-flex gap-x-1 items-center">
												<span> {{ data?.media?.format }} </span>
												<span v-if="data.media.episodes && data.media.format"
													class="size-1 rounded-full bg-(--ui-text-dimmed)" />
												<span v-if="data?.media?.episodes">
													<!-- Exemple to use for franchise only -->
													<template v-if="
														Array.isArray(data?.media?.episodes) &&
														data?.media?.episodes.length > 0
													">
														{{data?.media?.episodes?.reduce((sum: number, episode: number) => sum + episode, 0)}}
														episodes
													</template>
													<template v-else>
														{{ data?.media?.episodes }}
														{{ data?.media?.episodes > 1 ? "episodes" : "episode" }}
													</template>
												</span>
											</div>
										</template>
										<template #hover>
											<span v-if="data?.media?.season || data?.media?.seasonYear">
												{{ data.media.season }} {{ data.media.seasonYear }}
											</span>
										</template>
									</TextHover>
									<TextHover class="text-base text-pretty font-semibold text-highlighted leading-tight">
										<template #default>
											{{ data.media.title.english || data.media.title.romaji }}
										</template>
										<template #hover>
											{{ data.media.title.romaji }}
										</template>
									</TextHover>
									<TextHover class="inline-flex text-xs">
										<template #default>
											<div v-if="showStudios" class="inline-flex group-hover/subtitle:hidden text-(--anime-theme-color)"
												:style="{ '--anime-theme-color': data.media.coverImage.color }">
												<span v-for="(studio, index) in mainStudios" :key="studio.node.name">
													{{ Number(index) > 0 ? ", " : "" }} {{ studio.node.name }}
												</span>
											</div>
										</template>
										<template #hover>
											<div v-if="data.media.relations?.edges?.length"
												class="hidden group-hover/subtitle:inline-flex text-dimmed font-light italic truncate">
												<span v-if="data.media.relations.edges.some((edge: any) => edge.relationType === 'PREQUEL')">
													Sequel to "{{data.media.relations.edges.find((edge: any) => edge.relationType ===
														'PREQUEL')?.node.title.english || data.media.title}}"
												</span>
												<span
													v-else-if="data.media.relations.edges.some((edge: any) => edge.relationType === 'ADAPTATION')">
													Adapted from "{{data.media.relations.edges.find((edge: any) => edge.relationType ===
	'ADAPTATION')?.node.title.english || data.media.title.romaji}}"
												</span>
												<span v-else>
													Source : "{{
														data.media.relations.edges[0].node.title.english ||
														data.media.title.romaji
													}}"
												</span>
											</div>
										</template>
									</TextHover>
								</div>
								<span v-if="data?.score" class="text-right font-medium text-2xl text-highlighted w-fit">
									{{ data.score }} %
								</span>
							</div>
							<p v-html="sanitizedDescription" class="text-muted text-sm w-full leading-tight" :class="isHorizontal
								? hoveredContent
									? 'overflow-y-visible h-max'
									: 'overflow-y-hidden h-max max-h-22'
								: 'max-h-22 h-full overflow-y-hidden hover:overflow-y-auto'
								" />
						</div>
						<div v-show="showDetails" class="flex flex-col justify-evenly size-full gap-y-4">
							<div class="flex justify-between w-full">
								<UUser :ui="{ wrapper: 'flex flex-col-reverse' }" :name="ratedRankText" description="Ranking" />
								<UUser :ui="{ wrapper: 'flex flex-col-reverse' }" :name="popularRankText" description="Popularity" />
								<UUser :ui="{ wrapper: 'flex flex-col-reverse' }" :name="meanScoreText" description="Mean Score" />
								<UUser :ui="{ wrapper: 'flex flex-col-reverse' }" :name="favouritesText" description="Favourites" />
							</div>
							<div class="grid grid-cols-12 gap-2 justify-between w-full">
								<iframe v-if="data.media.trailer" :src="'https://www.youtube.com/embed/' +
									data.media.trailer.id +
									'?autoplay=0&autohide=1'
									" allow="autoplay" frameborder="0" class="rounded-lg w-full h-34"
									:class="nbLinks < 4 ? 'col-span-11' : 'col-span-10'" />
								<div class="grid auto-cols-max grid-flow-col grid-rows-5 gap-1 min-w-min h-fit flex-1 overflow-hidden"
									:class="nbLinks < 4 ? 'col-span-1' : 'col-span-2'">
									<ExternalLink v-for="(link, index) in data.media.externalLinks" :key="index" :color="link.color"
										:site="link.site" :url="link.url" />
								</div>
							</div>
						</div>
						<div v-if="showBadges" class="static flex w-full items-center justify-center py-3"
							:class="isHorizontal ? '' : '-mt-4'">
							<div :class="isHorizontal
								? 'relative col-span-2 flex gap-2 w-full items-center cursor-default'
								: 'relative flex gap-2 w-full items-center cursor-default'
								">
								<div ref="badgesEl" :class="[
									'flex gap-1 overflow-x-auto w-full z-50 scroll-auto snap-x touch-pan-x select-none',
									badgesOverflowing
										? isBadgesDragging
											? 'cursor-grabbing'
											: 'cursor-grab'
										: 'cursor-default',
								]" style="scrollbar-width: none">
									<UBadge v-for="genre in data.media.genres" :key="genre" variant="subtle" size="md"
										class="rounded-full whitespace-nowrap font-medium bg-(--anime-theme-color)/10 ring-(--anime-theme-color)/25 text-(--anime-theme-color)">
										{{ genre }}
									</UBadge>
								</div>
								<UButton :to="`https://anilist.co/anime/${data.media.id}`" target="_blank" variant="subtle" size="sm"
									class="rounded-full z-10 bg-(--anime-theme-color)/10 ring-(--anime-theme-color)/25 text-(--anime-theme-color) hover:bg-(--anime-theme-color)/50"
									icon="i-lucide-external-link" />
							</div>
						</div>
					</div>
				</div>
				<Icon v-if="draggable" name="i-lucide-grip-vertical" class="absolute right-3 top-3 text-dimmed hover:text-muted"
					:class="isDraggingPopover ? 'cursor-grabbing' : 'cursor-grab'" @mousedown="startDrag" />
			</div>
		</template>
	</UPopover>
</template>

<script lang="ts" setup>
import { useDraggable, useResizeObserver } from '@vueuse/core'
import type { PopoverProps, TabsItem } from '@nuxt/ui'
import TextHover from './TextHover.vue';

const props = withDefaults(defineProps<{
	data: any;
	orientation?: "vertical" | "horizontal";
	draggable?: boolean;
} & PopoverProps>(), {
	orientation: "horizontal",
	draggable: true
});

const defaultPopoverContent = {
	align: 'center',
	side: 'right',
	sideOffset: 8,
	updatePositionStrategy: 'always'
} satisfies NonNullable<PopoverProps['content']>;

const popoverContent = computed<PopoverProps['content']>(() => ({
	...defaultPopoverContent,
	...(props.content || {})
} as PopoverProps['content']));

const orientation = computed<'horizontal' | 'vertical'>(() => props.orientation ?? 'horizontal');

const isHorizontal = computed(() => orientation.value === 'horizontal');
const isVertical = computed(() => orientation.value === 'vertical');

const showTabs = computed(() => isHorizontal.value);
const showSummary = computed(() => activeTab.value === 'summary' || isVertical.value);
const showDetails = computed(() => activeTab.value === 'details' || isVertical.value);
const showBadges = computed(() => showSummary.value);

const items: TabsItem[] = [
	{
		label: 'Summary',
		value: 'summary',
	},
	{
		label: 'Details',
		value: 'details',
	}
]

const hoveredContent = ref(false);
const showStudios = ref(true);
const activeTab = ref("summary");

const media = computed(() => props.data?.media);
const mainStudios = computed(() => media.value?.studios?.edges?.filter((edge: any) => edge.isMain) || []);
const nbLinks = computed(() => Array(props.data.media.externalLinks).length);

const ratedRankText = computed(() => {
	const ranking = media.value?.rankings?.find((r: any) => r.type === 'RATED' && r.allTime);
	return ranking ? `#${ranking.rank}` : '-';
});

const popularRankText = computed(() => {
	const ranking = media.value?.rankings?.find((r: any) => r.type === 'POPULAR' && r.allTime);
	return ranking ? `#${ranking.rank}` : '-';
});

const meanScoreText = computed(() => (media.value?.meanScore ? `${media.value.meanScore.toFixed(0)} %` : '-'));
const favouritesText = computed(() => media.value?.favourites || '-');

const animeThemeColor = computed(() => props.data?.media?.coverImage?.color || 'var(--ui-color-primary-400)');
const sanitizedDescription = computed(() => (props.data?.media?.description || '').replace(/(<([^>]+)>)/ig, ''));


const badgesEl = ref<HTMLElement | null>(null);
const badgesOverflowing = ref(false);

function updateBadgesOverflow() {
	const el = badgesEl.value;
	if (!el) {
		badgesOverflowing.value = false;
		return;
	}
	badgesOverflowing.value = el.scrollWidth > el.clientWidth + 1;
}

useResizeObserver(badgesEl, updateBadgesOverflow);
onMounted(async () => {
	await nextTick();
	updateBadgesOverflow();
});
watch(() => props.data?.media?.genres, async () => {
	await nextTick();
	updateBadgesOverflow();
});

const badgesDrag = reactive({ startX: 0, startScrollLeft: 0 });
const { isDragging: isBadgesDragging } = useDraggable(badgesEl, {
	pointerTypes: ['mouse', 'touch', 'pen'],
	preventDefault: true,
	onStart(_, e) {
		if (!badgesOverflowing.value) return false;
		if (e instanceof PointerEvent && e.pointerType === 'mouse' && e.button !== 0) return false;
		const el = badgesEl.value;
		if (!el) return;
		if (!(e instanceof PointerEvent)) return;
		badgesDrag.startX = e.clientX;
		badgesDrag.startScrollLeft = el.scrollLeft;
	},
	onMove(_, e) {
		const el = badgesEl.value;
		if (!el) return;
		if (!(e instanceof PointerEvent)) return;
		const dx = e.clientX - badgesDrag.startX;
		el.scrollLeft = badgesDrag.startScrollLeft - dx;
	}
});

/* Draggable Popover Logic */
const popoverEl = ref<HTMLElement | null>(null);
const isDraggingPopover = ref(false);
const popoverOffset = reactive({ x: 0, y: 0 });
const dragStart = reactive({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
let draggedPanel: HTMLElement | null = null;

function startDrag(event: MouseEvent) {
	if (!popoverEl.value) return;
	// Target the parent element (the Popover Panel) to move the entire popover including shadow/ring
	const panel = popoverEl.value.parentElement;
	if (!panel) return;

	event.preventDefault();

	draggedPanel = panel;
	dragStart.mouseX = event.clientX;
	dragStart.mouseY = event.clientY;
	dragStart.startX = popoverOffset.x;
	dragStart.startY = popoverOffset.y;

	isDraggingPopover.value = true;

	window.addEventListener('mousemove', onDragMove);
	window.addEventListener('mouseup', stopDrag);
}

function onDragMove(event: MouseEvent) {
	if (!isDraggingPopover.value || !draggedPanel) return;
	const dx = event.clientX - dragStart.mouseX;
	const dy = event.clientY - dragStart.mouseY;

	popoverOffset.x = dragStart.startX + dx;
	popoverOffset.y = dragStart.startY + dy;

	// Use translate property to compose with Popper's transform
	draggedPanel.style.translate = `${popoverOffset.x}px ${popoverOffset.y}px`;
}

function stopDrag() {
	isDraggingPopover.value = false;
	draggedPanel = null;
	window.removeEventListener('mousemove', onDragMove);
	window.removeEventListener('mouseup', stopDrag);
}

// Reset position when popover re-opens
watch(popoverEl, (el) => {
	if (el) {
		popoverOffset.x = 0;
		popoverOffset.y = 0;
		// Since the panel is likely re-mounted, we don't need to manually clear the style.
		// If it's persistent, we might need to, but Headless UI usually unmounts.
	}
});
</script>




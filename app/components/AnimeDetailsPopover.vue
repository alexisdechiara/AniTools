<template>
	<UPopover :content="{
		align: 'center',
		side: 'right',
		sideOffset: 8
	}">
		<slot />
		<template #content>
			<div class="relative grid grid-cols-3 h-64 max-w-lg overflow-hidden"
				:style="{ '--anime-theme-color': data.media.coverImage.color }">
				<div class="col-span-1 h-full w-fit relative">
					<NuxtPicture :src="data.media.coverImage.large" :imgAttrs="{ class: 'size-full rounded-l-md' }" />
					<div class="inset-x-0 bottom-0 h-12 items-center rounded-b-md overflow-hidden"
						:class="[activeTab === 'summary' ? 'fixed grid grid-cols-3' : 'absolute flex']">
						<UTabs v-model="activeTab" size="xs" :items="items" :content="false"
							:ui="{ root: 'mx-auto opacity-95', indicator: `bg-(--anime-theme-color)`, trigger: 'cursor-pointer ring-0! ring-transparent! focus-visible:ring-transparent! focus-visible:ring-0!' }" />
						<div v-if="activeTab === 'summary'"
							class="relative col-span-2 flex gap-2 size-full items-center px-3 cursor-default">
							<div ref="badgesEl"
								class="flex gap-1 overflow-x-auto w-full z-50 scroll-auto snap-x touch-pan-x select-none"
								:class="badgesOverflowing ? (isBadgesDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'"
								style="scrollbar-width: none;">
								<UBadge v-for="genre in data.media.genres" :key="genre" variant="subtle" size="md"
									class="rounded-full whitespace-nowrap font-medium bg-(--anime-theme-color)/10 ring-(--anime-theme-color)/25 text-(--anime-theme-color)">
									{{ genre }}
								</UBadge>
							</div>
							<span class="absolute inset-0 bg-default z-0" />
							<UButton :to="`https://anilist.co/anime/${data.media.id}`" variant="subtle" size="sm"
								class="rounded-full z-10 bg-(--anime-theme-color)/10 ring-(--anime-theme-color)/25 text-(--anime-theme-color) hover:bg-(--anime-theme-color)/50"
								icon="i-lucide-external-link" />
						</div>
					</div>
				</div>
				<div id="content" class="col-span-2 flex flex-col gap-x-8 gap-y-4 p-4 sm:p-6 size-full"
					:class="hoveredContent ? 'overflow-y-auto' : 'overflow-y-hidden'" @mouseover="hoveredContent = true"
					@mouseleave="hoveredContent = false">
					<template v-if="activeTab === 'summary'">
						<div class="flex justify-between items-start">
							<div class="flex flex-col gap-y-0.5">

								<TextHover class="text-xs text-dimmed">
									<template #default>
										<div class="inline-flex gap-x-1 items-center">
											<span> {{ data?.media?.format }} </span>
											<span v-if="data.media.episodes && data.media.format"
												class="size-1 rounded-full bg-(--ui-text-dimmed)" />

											<span v-if="data?.media?.episodes"> <!-- Exemple to use for franchise only -->
												<template v-if="Array.isArray(data?.media?.episodes) && data?.media?.episodes.length > 0">
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
								<TextHover class="text-base text-pretty font-semibold text-highlighted">
									<template #default>
										{{ data.media.title.english }}
									</template>
									<template #hover>
										{{ data.media.title.romaji }}
									</template>
								</TextHover>
								<TextHover class="inline-flex text-xs">
									<template #default>
										<div v-if="showStudios" class="inline-flex group-hover/subtitle:hidden text-(--anime-theme-color)"
											:style="{ '--anime-theme-color': data.media.coverImage.color }">
											<span v-for="(studio, index) in data.media.studios.edges.filter((edge: any) => edge.isMain)"
												:key="studio.node.name">
												{{ Number(index) > 0 ? ", " : "" }} {{ studio.node.name }}
											</span>
										</div>

									</template>
									<template #hover>
										<div v-if="data.media.relations.edges.length"
											class="hidden group-hover/subtitle:inline-flex text-dimmed font-light italic truncate">

											<span
												v-if="data.media.relations.edges.some((edge: any) => edge.relationType === 'PREQUEL')">Sequel
												to "{{data.media.relations.edges.find((edge: any) => edge.relationType ===
													'PREQUEL')?.node.title.english || data.media.title}}"
											</span>

											<span
												v-else-if="data.media.relations.edges.some((edge: any) => edge.relationType === 'ADAPTATION')">
												Adapted from "{{data.media.relations.edges.find((edge: any) => edge.relationType ===
													'ADAPTATION')?.node.title.english || data.media.title.romaji}}"
											</span>
											<span v-else>
												Source : "{{ data.media.relations.edges[0].node.title.english || data.media.title.romaji }}"
											</span>
										</div>

									</template>
								</TextHover>

							</div>
							<span v-if="data?.score" class="text-right font-medium text-2xl text-highlighted">
								{{ data.score }} %
							</span>

						</div>
						<p v-html="data.media.description.replace(/(<([^>]+)>)/ig, '')" class="text-muted text-sm w-full h-max"
							:class="hoveredContent ? 'overflow-y-visible pb-6' : 'overflow-y-hidden'" />
					</template>
					<div v-show="activeTab === 'details'" class="flex flex-col justify-evenly size-full gap-y-4">

						<div class="flex justify-between w-full">
							<UUser :ui="{ wrapper: 'flex flex-col-reverse' }"
								:name="data?.media?.rankings?.find((r: any) => r.type === 'RATED' && r.allTime) ? '#' + data?.media?.rankings?.find((r: any) => r.type === 'RATED' && r.allTime)?.rank : '-'"
								description="Ranking" />
							<UUser :ui="{ wrapper: 'flex flex-col-reverse' }"
								:name="data?.media?.rankings?.find((r: any) => r.type === 'POPULAR' && r.allTime) ? '#' + data?.media?.rankings?.find((r: any) => r.type === 'POPULAR' && r.allTime)?.rank : '-'"
								description="Popularity" />

							<UUser :ui="{ wrapper: 'flex flex-col-reverse' }"
								:name="data.media.meanScore ? data.media.meanScore.toFixed(0) + ' %' : '-'" description="Mean Score" />
							<UUser :ui="{ wrapper: 'flex flex-col-reverse' }" :name="data.media.favourites || '-'"
								description="Favourites" />
						</div>
						<div class="grid grid-cols-6 gap-2 justify-between h-36 size-full">

							<iframe v-if="data.media.trailer"
								:src="'https://www.youtube.com/embed/' + data.media.trailer.id + '?autoplay=0&autohide=1'"
								allow="autoplay" frameborder="0" class="rounded-lg col-span-5 size-full" />
							<div class="grid grid-rows-5 auto-cols-max grid-flow-col gap-1 min-w-min h-full flex-1 overflow-hidden">

								<NuxtLink v-for="(link, index) in data.media.externalLinks" :key="index" :to="link.url" target="_blank"
									:style="{ '--simple-icons-color': link.color || 'black' }"
									class="bg-(--simple-icons-color) rounded-sm flex justify-center items-center size-6">
									<Icon :name="`i-simple-icons-${link.site.toLowerCase()}`" class="text-inverted" />
								</NuxtLink>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</UPopover>
</template>

<script lang="ts" setup>
import { useDraggable, useResizeObserver } from '@vueuse/core'
import type { PopoverProps, TabsItem } from '@nuxt/ui'
import TextHover from './TextHover.vue';

const props = defineProps<{
	data: any;
} & PopoverProps>();

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
</script>



<style>
#content {
	scrollbar-gutter: stable;
}
</style>



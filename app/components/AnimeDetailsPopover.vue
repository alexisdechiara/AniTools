<template>
	<UPopover :content="{
		align: 'center',
		side: 'right',
		sideOffset: 8
	}">
		<slot />
		<template #content>
			<div class="grid grid-cols-3 h-64 max-w-lg" :style="{ '--anime-theme-color': data.media.coverImage.color }">
				<div class="col-span-1 h-full w-fit relative">
					<NuxtPicture :src="data.media.coverImage.large" :imgAttrs="{ class: 'size-full' }" />
					<UTabs v-model="activeTab" size="sm" :items="items" :content="false"
						:ui="{ root: 'absolute bottom-2 inset-x-2 opacity-95', indicator: `bg-(--anime-theme-color)`, trigger: 'cursor-pointer' }" />
				</div>
				<div id="content" class="col-span-2 flex flex-col gap-x-8 gap-y-4 p-4 sm:p-6 size-full"
					:class="hoveredContent ? 'overflow-y-auto' : 'overflow-y-hidden'" @mouseover="hoveredContent = true"
					@mouseleave="hoveredContent = false">
					<template v-if="activeTab === 'summary'">
						<div class="flex flex-col gap-y-0.5">
							<div class="inline-flex gap-x-1 text-xs text-dimmed items-center">
								<span>{{ data?.media?.format }}</span>
								<span v-if="data.media.episodes && data.media.format"
									class="size-1 rounded-full bg-(--ui-text-dimmed)" />
								<span v-if="data?.media?.episodes">
									{{ data?.media?.episodes }}
									{{ data?.media?.episodes > 1 ? "episodes" : "episode" }}
								</span>
								<span v-if="data.media.episodes && (data.media.season || data.media.seasonYear)"
									class="size-1 rounded-full bg-(--ui-text-dimmed)" />
								<span v-if="data?.media?.season || data?.media?.seasonYear">
									{{ data.media.season }} {{ data.media.seasonYear }}
								</span>
							</div>
							<span class="text-base text-pretty font-semibold text-highlighted">
								{{ data.media.title.english || data.media.title.romaji }}
							</span>
							<div class="group/subtitle inline-flex text-xs">
								<div v-if="showStudios" class="inline-flex group-hover/subtitle:hidden text-(--anime-theme-color)"
									:style="{ '--anime-theme-color': data.media.coverImage.color }">
									<span v-for="(studio, index) in data.media.studios.edges.filter((edge: any) => edge.isMain)"
										:key="studio.node.name">
										{{ Number(index) > 0 ? ", " : "" }} {{ studio.node.name }}
									</span>
								</div>
								<div v-if="data.media.relations.edges.length"
									class="hidden group-hover/subtitle:inline-flex text-dimmed font-light italic truncate">
									<span v-if="data.media.relations.edges.some((edge: any) => edge.relationType === 'PREQUEL')">Sequel to
										"{{
											data.media.relations.edges.find((edge: any) => edge.relationType === 'PREQUEL')?.node.title.english
											||
											data.media.title.romaji}}"
									</span>
									<span v-else-if="data.media.relations.edges.some((edge: any) => edge.relationType === 'ADAPTATION')">
										Adapted from "{{data.media.relations.edges.find((edge: any) => edge.relationType ===
											'ADAPTATION')?.node.title.english || data.media.title.romaji}}"
									</span>
									<span v-else>
										Source : "{{ data.media.relations.edges[0].node.title.english || data.media.title.romaji }}"
									</span>
								</div>
							</div>
						</div>
						<p v-html="data.media.description.replace(/(<([^>]+)>)/ig, '')" class="text-muted text-sm size-full"
							:class="hoveredContent ? 'overflow-y-visible' : 'overflow-y-hidden'" />
					</template>
					<template v-else>
						<div class="flex justify-between w-full">
							<UUser :ui="{ wrapper: 'flex flex-col-reverse' }" :name="data.score || '-'" description="Your Score" />
							<UUser :ui="{ wrapper: 'flex flex-col-reverse' }"
								:name="data.media.meanScore ? data.media.meanScore.toFixed(0) + ' %' : '-'" description="Mean Score" />
							<UUser :ui="{ wrapper: 'flex flex-col-reverse' }" :name="data.media.favourites || '-'"
								description="Favourites" />
						</div>
						<div class="flex gap-2 h-36">
							<iframe v-if="data.media.trailer"
								:src="'https://www.youtube.com/embed/' + data.media.trailer.id + '?autoplay=0&autohide=1'"
								allow="autoplay" frameborder="0" class="rounded-lg h-34 w-full aspect-video flex" />
							<div class="flex flex-col gap-1 flex-wrap min-w-16 size-full flex-1 overflow-hidden">
								<NuxtLink v-for="(link, index) in data.media.externalLinks" :key="index" :to="link.url" target="_blank"
									:style="{ '--simple-icons-color': link.color || 'black' }"
									class="bg-(--simple-icons-color) rounded-sm flex justify-center items-center size-6">
									<Icon :name="`i-simple-icons-${link.site.toLowerCase()}`" class="text-inverted" />
								</NuxtLink>
							</div>
						</div>
					</template>
				</div>
			</div>
		</template>
	</UPopover>
</template>

<script lang="ts" setup>
defineProps<{
	data: any;
} & PopoverProps>();

import type { PopoverProps, TabsItem } from '@nuxt/ui'

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
</script>



<style>
#content {
	scrollbar-gutter: stable;
}
</style>

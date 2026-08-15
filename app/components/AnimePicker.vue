<script setup lang="ts">
import type {
	AniListMediaResponse,
	AniListMediaSummary,
	AniListSearchResponse
} from "~~/shared/types/anilist"
import { getCreateMediaTitle } from "~/utils/create-artwork"

interface PickerItem {
	id: number
	title: string
	media: AniListMediaSummary | null
}

const props = withDefaults(defineProps<{
	suggestions?: readonly AniListMediaSummary[]
	excludedIds?: readonly number[]
	searchable?: boolean
	actionLabel?: string
	emptyLabel?: string
}>(), {
	suggestions: () => [],
	excludedIds: () => [],
	searchable: true,
	actionLabel: "Use",
	emptyLabel: "No anime available."
})

const emit = defineEmits<{
	select: [media: AniListMediaSummary]
}>()

const searchTerm = ref("")
const searchResults = ref<AniListSearchResponse["result"]["predictions"]>([])
const mediaCache = reactive(new Map<number, AniListMediaSummary>())
const loadingSearch = ref(false)
const loadingMediaId = ref<number | null>(null)
const activeId = ref<number | null>(null)
const error = ref<string | null>(null)
const excludedIds = computed(() => new Set(props.excludedIds))

const suggestionItems = computed<PickerItem[]>(() => props.suggestions
	.filter(media => !excludedIds.value.has(media.id))
	.slice(0, props.searchable ? 60 : 10)
	.map(media => ({
		id: media.id,
		title: getCreateMediaTitle(media, "userPreferred"),
		media
	})))

const visibleItems = computed<PickerItem[]>(() => {
	if (!props.searchable || searchTerm.value.trim().length < 2) return suggestionItems.value
	return searchResults.value
		.filter(result => !excludedIds.value.has(result.id))
		.map(result => ({
			id: result.id,
			title: result.title,
			media: mediaCache.get(result.id) ?? null
		}))
})

const activeItem = computed(() =>
	visibleItems.value.find(item => item.id === activeId.value)
	?? suggestionItems.value.find(item => item.id === activeId.value)
	?? null
)
const activeMedia = computed(() => activeId.value
	? mediaCache.get(activeId.value) ?? activeItem.value?.media ?? null
	: null
)
const description = computed(() => (activeMedia.value?.description ?? "")
	.replace(/<br\s*\/?>/gi, " ")
	.replace(/<[^>]*>/g, "")
	.replace(/\s+/g, " ")
	.trim()
)
const cover = computed(() => activeMedia.value?.coverImage?.extraLarge
	?? activeMedia.value?.coverImage?.large
	?? activeMedia.value?.coverImage?.medium
	?? null
)
const animeUrl = computed(() => activeMedia.value?.siteUrl
	?? (activeMedia.value ? `https://anilist.co/anime/${activeMedia.value.id}` : null)
)

const runSearch = useDebounceFn(async () => {
	const query = searchTerm.value.trim()
	if (query.length < 2) {
		searchResults.value = []
		error.value = null
		return
	}

	loadingSearch.value = true
	error.value = null
	try {
		const response = await $fetch<AniListSearchResponse>("/api/search", {
			query: { q: query }
		})
		searchResults.value = response.result.predictions
	} catch {
		searchResults.value = []
		error.value = "AniList search is unavailable. Try again in a moment."
	} finally {
		loadingSearch.value = false
	}
}, 400)

watch(searchTerm, runSearch)

watch(visibleItems, (items) => {
	if (!items.some(item => item.id === activeId.value)) {
		activeId.value = items[0]?.id ?? null
	}
	const firstItem = items[0]
	if (firstItem) void previewItem(firstItem)
}, { immediate: true })

async function resolveMedia(item: PickerItem): Promise<AniListMediaSummary | null> {
	const cached = mediaCache.get(item.id)
	if (cached) return cached

	loadingMediaId.value = item.id
	error.value = null
	try {
		const response = await $fetch<AniListMediaResponse>("/api/anilist/media", {
			query: { id: item.id }
		})
		mediaCache.set(item.id, response.media)
		return response.media
	} catch {
		error.value = "Anime details could not be loaded."
		return item.media
	} finally {
		if (loadingMediaId.value === item.id) loadingMediaId.value = null
	}
}

async function previewItem(item: PickerItem): Promise<void> {
	activeId.value = item.id
	await resolveMedia(item)
}

async function selectItem(item: PickerItem): Promise<void> {
	activeId.value = item.id
	const media = await resolveMedia(item)
	if (media) emit("select", media)
}
</script>

<template>
	<div class="grid max-h-[min(42rem,78vh)] min-h-112 overflow-hidden md:grid-cols-[minmax(0,1fr)_21rem]">
		<section class="flex min-h-0 flex-col border-b border-default md:border-r md:border-b-0" aria-label="Anime results">
			<div v-if="searchable" class="border-b border-default p-3">
				<UInput
					v-model="searchTerm"
					icon="i-lucide-search"
					placeholder="Search anime..."
					autofocus
					class="mx-auto w-full max-w-xl"
					aria-label="Search anime" />
			</div>

			<div data-anime-picker-scroll class="min-h-0 flex-1 overflow-y-auto p-2">
				<div v-if="loadingSearch" class="flex min-h-32 items-center justify-center gap-2 text-sm text-muted">
					<UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
					Searching AniList…
				</div>
				<p v-else-if="!visibleItems.length" class="p-6 text-center text-sm text-muted">
					{{ emptyLabel }}
				</p>
				<ul v-else class="mx-auto max-w-xl space-y-1" role="listbox" aria-label="Anime">
					<li
						v-for="item in visibleItems"
						:key="item.id"
						class="group flex items-stretch rounded-lg"
						:class="activeId === item.id ? 'bg-primary/10' : 'hover:bg-elevated'"
						@mouseenter="previewItem(item)">
						<button
							type="button"
							class="min-w-0 flex-1 cursor-pointer px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-primary"
							:aria-selected="activeId === item.id"
							@click="selectItem(item)"
							@focus="previewItem(item)">
							<span class="block truncate text-sm font-medium text-highlighted">{{ item.title }}</span>
							<span v-if="item.media" class="mt-0.5 block truncate text-xs text-muted">
								{{ item.media.format?.replaceAll("_", " ") || "Anime" }}
								<span v-if="item.media.seasonYear"> · {{ item.media.seasonYear }}</span>
							</span>
						</button>
						<UButton
							icon="i-lucide-plus"
							color="neutral"
							variant="ghost"
							:loading="loadingMediaId === item.id"
							:aria-label="`${actionLabel} ${item.title}`"
							class="m-1 shrink-0 self-center rounded-full"
							@click="selectItem(item)" />
					</li>
				</ul>
			</div>
		</section>

		<aside data-anime-picker-scroll class="min-h-64 overflow-y-auto bg-elevated/40 p-4" aria-label="Anime details">
			<div v-if="activeMedia" class="flex min-h-full flex-col">
				<div class="relative aspect-video overflow-hidden rounded-xl bg-muted">
					<NuxtImg
						v-if="activeMedia.bannerImage || cover"
						:src="activeMedia.bannerImage || cover!"
						:alt="getCreateMediaTitle(activeMedia, 'userPreferred')"
						class="size-full object-cover" />
					<div class="absolute inset-0 bg-linear-to-t from-black/65 via-transparent to-transparent" />
					<UButton
						v-if="animeUrl"
						:to="animeUrl"
						target="_blank"
						rel="noopener noreferrer"
						external
						icon="i-lucide-external-link"
						color="neutral"
						variant="solid"
						size="sm"
						class="absolute top-2 right-2 rounded-full"
						aria-label="Open this anime on AniList" />
				</div>

				<h3 class="mt-4 text-lg leading-tight font-semibold text-highlighted">
					{{ getCreateMediaTitle(activeMedia, "userPreferred") }}
				</h3>
				<p class="mt-1 text-xs text-muted">
					{{ activeMedia.format?.replaceAll("_", " ") || "Anime" }}
					<span v-if="activeMedia.seasonYear"> · {{ activeMedia.season }} {{ activeMedia.seasonYear }}</span>
					<span v-if="activeMedia.episodes"> · {{ activeMedia.episodes }} episodes</span>
				</p>
				<div class="mt-3 grid grid-cols-3 gap-2 text-center">
					<div class="rounded-lg bg-default p-2">
						<p class="text-sm font-semibold text-highlighted">{{ activeMedia.meanScore ?? "–" }}</p>
						<p class="text-[10px] text-muted">Mean score</p>
					</div>
					<div class="rounded-lg bg-default p-2">
						<p class="text-sm font-semibold text-highlighted">{{ activeMedia.popularity ?? "–" }}</p>
						<p class="text-[10px] text-muted">Popularity</p>
					</div>
					<div class="rounded-lg bg-default p-2">
						<p class="text-sm font-semibold text-highlighted">{{ activeMedia.favourites ?? "–" }}</p>
						<p class="text-[10px] text-muted">Favourites</p>
					</div>
				</div>
				<p v-if="description" class="mt-3 line-clamp-6 text-xs leading-relaxed text-toned">
					{{ description }}
				</p>
				<div class="mt-3 flex flex-wrap gap-1">
					<UBadge
						v-for="genre in (activeMedia.genres ?? []).slice(0, 5)"
						:key="genre"
						:label="genre"
						color="neutral"
						variant="subtle"
						class="rounded-full" />
				</div>
			</div>
			<div v-else class="flex min-h-64 items-center justify-center text-center text-sm text-muted">
				{{ loadingMediaId ? "Loading details…" : "Hover or focus an anime to preview it." }}
			</div>
			<UAlert v-if="error" :title="error" color="error" variant="soft" class="mt-3" />
		</aside>
	</div>
</template>

<style scoped>
[data-anime-picker-scroll] {
	scrollbar-width: none;
}

[data-anime-picker-scroll]::-webkit-scrollbar {
	display: none;
}
</style>

<script setup lang="ts">
import type {
	AniListMediaListSummary,
	AniListMediaResponse,
	AniListSearchResponse
} from "~~/shared/types/anilist"
import { getMediaCover, sanitizeMediaDescription } from "~/utils/media-display"

interface PickerItem {
	id: number
	title: string
	media: AniListMediaListSummary | null
}

const props = withDefaults(defineProps<{
	suggestions?: readonly AniListMediaListSummary[]
	excludedIds?: readonly number[]
	searchable?: boolean
	actionLabel?: string
	emptyLabel?: string
	/**
	 * Keeps the picker usable for several picks in a row. A picked row stays in the list, marked
	 * "Added", once its id shows up in `excludedIds`: that is how the parent confirms the add.
	 */
	multiple?: boolean
}>(), {
	suggestions: () => [],
	excludedIds: () => [],
	searchable: true,
	actionLabel: "Use",
	emptyLabel: "No anime available.",
	multiple: false
})

const emit = defineEmits<{
	select: [media: AniListMediaListSummary]
}>()

const { title: getAnimeTitle } = useMediaTitle()
const listboxId = useId()
const searchTerm = ref("")
const searchResults = ref<AniListSearchResponse["result"]["predictions"]>([])
/** The query the current `searchResults` answer, so Enter can wait for a search still in flight. */
const resultsQuery = ref("")
const mediaCache = reactive(new Map<number, AniListMediaListSummary>())
/** Ids picked in this session: they stay listed even once the parent excludes them. */
const pickedIds = reactive(new Set<number>())
const loadingSearch = ref(false)
const loadingMediaId = ref<number | null>(null)
const activeId = ref<number | null>(null)
const error = ref<string | null>(null)
const announcement = ref("")
const pendingEnter = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const excludedIds = computed(() => new Set(props.excludedIds))
const trimmedTerm = computed(() => searchTerm.value.trim())
const isSearching = computed(() => props.searchable && trimmedTerm.value.length >= 2)

function isHidden(id: number): boolean {
	return excludedIds.value.has(id) && !pickedIds.has(id)
}

/** A pick the parent confirmed by excluding it; it turns addable again if the parent drops it. */
function isAdded(id: number): boolean {
	return pickedIds.has(id) && excludedIds.value.has(id)
}

const suggestionItems = computed<PickerItem[]>(() => props.suggestions
	.filter(media => !isHidden(media.id))
	.slice(0, props.searchable ? 60 : 10)
	.map(media => ({
		id: media.id,
		title: getAnimeTitle(media),
		media
	})))

const visibleItems = computed<PickerItem[]>(() => {
	if (!isSearching.value) return suggestionItems.value
	return searchResults.value
		.filter(result => !isHidden(result.id))
		.map((result) => {
			const media = mediaCache.get(result.id) ?? null
			return {
				id: result.id,
				// The search endpoint returns one fixed title; switch to the visitor's title
				// language as soon as the full record is known.
				title: media ? getAnimeTitle(media) : result.title,
				media
			}
		})
})

const emptyMessage = computed(() => isSearching.value && !error.value
	? `No anime matches “${trimmedTerm.value}”.`
	: props.emptyLabel
)
const showList = computed(() => !loadingSearch.value && visibleItems.value.length > 0)
const activeItem = computed(() =>
	visibleItems.value.find(item => item.id === activeId.value)
	?? suggestionItems.value.find(item => item.id === activeId.value)
	?? null
)
const activeMedia = computed(() => activeId.value
	? mediaCache.get(activeId.value) ?? activeItem.value?.media ?? null
	: null
)
const activeOptionId = computed(() => showList.value && activeItem.value
	? optionId(activeItem.value.id)
	: undefined
)
const description = computed(() => sanitizeMediaDescription(activeMedia.value?.description))
const cover = computed(() => getMediaCover(activeMedia.value))
const animeUrl = computed(() => activeMedia.value?.siteUrl
	?? (activeMedia.value ? `https://anilist.co/anime/${activeMedia.value.id}` : null)
)

function optionId(id: number): string {
	return `${listboxId}-option-${id}`
}

let searchRequest = 0

const runSearch = useDebounceFn(async () => {
	const query = trimmedTerm.value
	if (query.length < 2) {
		// Supersede any pending request so it cannot repopulate the cleared field.
		searchRequest++
		searchResults.value = []
		resultsQuery.value = ""
		error.value = null
		loadingSearch.value = false
		return
	}

	const requestId = ++searchRequest
	loadingSearch.value = true
	error.value = null
	try {
		const response = await $fetch<AniListSearchResponse>("/api/search", {
			query: { q: query }
		})
		if (requestId !== searchRequest) return
		searchResults.value = response.result.predictions
		resultsQuery.value = query
	} catch {
		if (requestId !== searchRequest) return
		searchResults.value = []
		resultsQuery.value = query
		error.value = "AniList search is unavailable. Try again in a moment."
	} finally {
		if (requestId === searchRequest) {
			loadingSearch.value = false
			if (pendingEnter.value) {
				pendingEnter.value = false
				await nextTick()
				const first = visibleItems.value[0]
				if (first) void selectItem(first)
			}
		}
	}
}, 400)

watch(searchTerm, () => {
	pendingEnter.value = false
	void runSearch()
})

watch(visibleItems, (items) => {
	// Only re-home the active option when it left the list: the list recomputes each time a
	// record lands in the cache, and resetting then would undo arrow-key navigation.
	if (items.some(item => item.id === activeId.value)) return
	const firstItem = items[0]
	activeId.value = firstItem?.id ?? null
	if (firstItem) void resolveMedia(firstItem)
}, { immediate: true })

async function resolveMedia(item: PickerItem): Promise<AniListMediaListSummary | null> {
	const cached = mediaCache.get(item.id)
	if (cached) return cached
	if (item.media) {
		mediaCache.set(item.id, item.media)
		return item.media
	}

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
	if (isAdded(item.id)) return
	const media = await resolveMedia(item)
	if (!media) return
	// Before the emit: the parent excludes the id synchronously, and the row must not vanish.
	if (props.multiple) pickedIds.add(item.id)
	emit("select", media)
	if (!props.multiple) return

	await nextTick()
	if (!isAdded(item.id)) return
	// Clear first so the same sentence is announced again when it repeats.
	announcement.value = ""
	await nextTick()
	announcement.value = `Added ${getAnimeTitle(media)}`
}

function moveActive(target: 1 | -1 | "first" | "last"): void {
	const items = visibleItems.value
	if (!showList.value || !items.length) return
	const current = items.findIndex(item => item.id === activeId.value)
	let index: number
	if (target === "first") index = 0
	else if (target === "last") index = items.length - 1
	else if (current === -1) index = target === 1 ? 0 : items.length - 1
	else index = Math.min(items.length - 1, Math.max(0, current + target))

	const item = items[index]
	if (!item) return
	void previewItem(item)
	void nextTick(() => {
		const option = rootRef.value?.querySelector<HTMLElement>(`[data-picker-option="${item.id}"]`)
		if (typeof option?.scrollIntoView === "function") option.scrollIntoView({ block: "nearest" })
	})
}

function handleKeydown(event: KeyboardEvent): void {
	if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
	switch (event.key) {
		case "ArrowDown":
			event.preventDefault()
			moveActive(1)
			break
		case "ArrowUp":
			event.preventDefault()
			moveActive(-1)
			break
		case "Home":
			// Leave Home and End to the caret while there is text to move through.
			if (props.searchable && searchTerm.value) return
			event.preventDefault()
			moveActive("first")
			break
		case "End":
			if (props.searchable && searchTerm.value) return
			event.preventDefault()
			moveActive("last")
			break
		case "Enter": {
			event.preventDefault()
			// Enter pressed before the results for this text arrived: add the first one when they do.
			if (isSearching.value && (loadingSearch.value || resultsQuery.value !== trimmedTerm.value)) {
				pendingEnter.value = true
				return
			}
			const item = activeItem.value ?? visibleItems.value[0]
			if (item && showList.value) void selectItem(item)
			break
		}
	}
}

let lastPointer: { x: number, y: number } | null = null

/**
 * Hover previews a row, but only when the pointer really moved: browsers also fire pointer
 * events for a resting cursor when the list scrolls or re-renders under it, and those must
 * not steal the option the arrow keys are on.
 */
function handlePointerMove(event: PointerEvent, item: PickerItem): void {
	const previous = lastPointer
	lastPointer = { x: event.clientX, y: event.clientY }
	if (!previous || (previous.x === event.clientX && previous.y === event.clientY)) return
	if (activeId.value !== item.id) void previewItem(item)
}

function handleListKeydown(event: KeyboardEvent): void {
	// With a search field the field owns the keyboard; the list only does when it stands alone.
	if (!props.searchable) handleKeydown(event)
}

function keepFieldFocus(event: MouseEvent): void {
	// Options are not focusable, so a click would otherwise drop focus out of the search field.
	if (props.searchable) event.preventDefault()
}
</script>

<template>
	<div
		ref="rootRef"
		class="grid max-h-[min(42rem,78vh)] min-h-112 overflow-hidden md:grid-cols-[minmax(0,1fr)_21rem]">
		<section class="flex min-h-0 flex-col border-b border-default md:border-r md:border-b-0" aria-label="Anime results">
			<div v-if="searchable" class="border-b border-default p-3">
				<UInput
					v-model="searchTerm"
					icon="i-lucide-search"
					placeholder="Search anime..."
					autofocus
					autocomplete="off"
					class="mx-auto w-full max-w-xl"
					role="combobox"
					aria-label="Search anime"
					aria-autocomplete="list"
					aria-haspopup="listbox"
					:aria-controls="listboxId"
					:aria-expanded="showList"
					:aria-activedescendant="activeOptionId"
					@keydown="handleKeydown" />
			</div>

			<p class="sr-only" role="status" aria-live="polite" data-picker-status>{{ announcement }}</p>

			<div data-anime-picker-scroll class="min-h-0 flex-1 overflow-y-auto p-2">
				<div v-if="loadingSearch" class="flex min-h-32 items-center justify-center gap-2 text-sm text-muted">
					<UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
					Searching AniList…
				</div>
				<p v-else-if="!visibleItems.length" class="p-6 text-center text-sm text-muted">
					{{ emptyMessage }}
				</p>
				<!-- Options are not focusable: the search field (or the list itself when there is no
					field) keeps focus and points at the active option with aria-activedescendant. -->
				<ul
					v-if="showList"
					:id="listboxId"
					data-picker-list
					class="mx-auto max-w-xl space-y-1 rounded-lg"
					role="listbox"
					aria-label="Anime"
					:tabindex="searchable ? undefined : 0"
					:aria-activedescendant="searchable ? undefined : activeOptionId"
					@keydown="handleListKeydown"
					@mousedown="keepFieldFocus">
					<li
						v-for="item in visibleItems"
						:id="optionId(item.id)"
						:key="item.id"
						role="option"
						:data-picker-option="item.id"
						:data-active="activeId === item.id ? '' : undefined"
						:aria-selected="activeId === item.id"
						:aria-disabled="isAdded(item.id) ? 'true' : undefined"
						:aria-label="isAdded(item.id) ? `${item.title}, added` : `${actionLabel} ${item.title}`"
						class="flex min-h-11 scroll-my-2 items-center gap-2 rounded-lg px-3 py-2"
						:class="[
							activeId === item.id ? 'bg-primary/10' : 'hover:bg-elevated',
							isAdded(item.id) ? 'cursor-default' : 'cursor-pointer'
						]"
						@pointermove="handlePointerMove($event, item)"
						@click="selectItem(item)">
						<span class="min-w-0 flex-1">
							<span
								class="block truncate text-sm font-medium"
								:class="isAdded(item.id) ? 'text-muted' : 'text-highlighted'">{{ item.title }}</span>
							<span v-if="item.media" class="mt-0.5 block truncate text-xs text-muted">
								{{ item.media.format?.replaceAll("_", " ") || "Anime" }}
								<span v-if="item.media.seasonYear"> · {{ item.media.seasonYear }}</span>
							</span>
						</span>
						<span
							v-if="isAdded(item.id)"
							data-picker-added
							class="flex shrink-0 items-center gap-1 text-xs font-medium text-success"
							aria-hidden="true">
							<UIcon name="i-lucide-check" class="size-4" />
							Added
						</span>
						<span
							v-else
							class="flex size-8 shrink-0 items-center justify-center rounded-full text-muted"
							aria-hidden="true">
							<UIcon
								:name="loadingMediaId === item.id ? 'i-lucide-loader-circle' : 'i-lucide-plus'"
								class="size-4"
								:class="loadingMediaId === item.id ? 'animate-spin' : ''" />
						</span>
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
						:alt="getAnimeTitle(activeMedia)"
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
					{{ getAnimeTitle(activeMedia) }}
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
/* A thin themed scrollbar: long result lists need a visible scroll cue. */
[data-anime-picker-scroll] {
	scrollbar-width: thin;
	scrollbar-color: var(--ui-border-accented) transparent;
}

[data-picker-list]:focus-visible {
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
}

/* The list owns focus when there is no search field: show which option the keys act on. */
[data-picker-list]:focus-visible [data-active] {
	box-shadow: inset 0 0 0 2px var(--ui-primary);
}
</style>

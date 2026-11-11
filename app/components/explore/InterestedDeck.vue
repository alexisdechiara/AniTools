<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui"
import { getExploreRelationBadge } from "~/utils/explore"
import {
	buildExplorePicksExport,
	buildExplorePicksLinks,
	getExplorePickUrl,
	getExplorePicksExportFilename,
	type ExplorePickMedia
} from "~/utils/explore-picks"
import { getMediaCover } from "~/utils/media-display"

const props = withDefaults(defineProps<{
	addingAll?: boolean
	addingMediaIds?: readonly number[]
	canAddToPlanning?: boolean
	media?: readonly ExplorePickMedia[]
	passedCount?: number
	undoDisabled?: boolean
}>(), {
	addingAll: false,
	addingMediaIds: () => [],
	canAddToPlanning: false,
	media: () => [],
	passedCount: 0,
	undoDisabled: true
})

const emit = defineEmits<{
	addAllToPlanning: []
	addToPlanning: [media: ExplorePickMedia]
	clear: []
	undo: [media: ExplorePickMedia]
	undoLast: []
}>()

// Saving to AniList needs an OAuth session. The login page sends the visitor back here.
const signInLink = { path: "/login", query: { redirect: "/explore" } }
const UNDO_HINT ="Undo is not kept across reloads. Each pick has its own undo."

const deckMedia = computed(() => [...props.media].reverse())
const addingIds = computed(() => new Set(props.addingMediaIds))
const clearOpen = ref(false)
const undoHintId = useId()
// Saved picks without an undo history: the page was reloaded since they were made.
const showUndoHint = computed(() =>
	props.undoDisabled && !props.addingAll && props.media.length > 0
)
const canClear = computed(() => props.media.length > 0 || props.passedCount > 0)
const clearDescription = computed(() =>
	`This forgets ${countLabel(props.media.length, "interested title")} and ${countLabel(props.passedCount, "passed title")} for this profile on this device. Passed titles can then be suggested again.`
)

const { title: getAnimeTitle } = useMediaTitle()
const toast = useToast()

const exportItems = computed<DropdownMenuItem[]>(() => [
	{
		label: "Download JSON",
		icon: "i-lucide-file-json",
		onSelect: downloadJson
	},
	{
		label: "Copy AniList links",
		icon: "i-lucide-link",
		onSelect: () => void copyLinks()
	}
])

function countLabel(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? "" : "s"}`
}

function cover(media: ExplorePickMedia): string | null {
	// A 64px-wide thumbnail: the mid-size AniList cover is enough, even at 2x.
	return getMediaCover(media, "medium")
}

function relationBadge(media: ExplorePickMedia) {
	return getExploreRelationBadge(media)
}

// Both exports are built in the browser from the saved picks: nothing is sent anywhere.
function downloadJson(): void {
	if (!props.media.length) return

	try {
		const exportedAt = new Date()
		const payload = buildExplorePicksExport(deckMedia.value, exportedAt, getAnimeTitle)
		const url = URL.createObjectURL(new Blob(
			[JSON.stringify(payload, null, 2)],
			{ type: "application/json" }
		))
		const anchor = document.createElement("a")
		anchor.href = url
		anchor.download = getExplorePicksExportFilename(exportedAt)
		anchor.click()
		URL.revokeObjectURL(url)
	} catch {
		toast.add({
			title: "Could not download your picks",
			description: "Your browser blocked the download. Try again.",
			color: "error",
			icon: "i-lucide-triangle-alert"
		})
	}
}

async function copyLinks(): Promise<void> {
	if (!props.media.length) return

	try {
		await navigator.clipboard.writeText(buildExplorePicksLinks(deckMedia.value))
		toast.add({
			title: "AniList links copied",
			description: `${countLabel(props.media.length, "link")} copied to your clipboard.`,
			color: "success",
			icon: "i-lucide-clipboard-check"
		})
	} catch {
		toast.add({
			title: "Could not copy the links",
			description: "Your browser blocked clipboard access. Use Download JSON instead.",
			color: "error",
			icon: "i-lucide-triangle-alert"
		})
	}
}

function confirmClear(): void {
	clearOpen.value = false
	emit("clear")
}
</script>

<template>
	<aside
		class="overflow-hidden rounded-3xl border border-default bg-default/95 shadow-lg backdrop-blur-xl"
		aria-label="Interested anime">
		<header class="space-y-3 border-b border-default p-4">
			<div class="flex items-center justify-between gap-3">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<UIcon name="i-lucide-heart" class="size-4 text-muted" aria-hidden="true" />
						<h2 class="truncate text-sm font-semibold text-highlighted">Interested</h2>
						<UBadge :label="String(media.length)" color="neutral" variant="soft" size="sm" />
					</div>
					<p class="mt-0.5 text-xs text-muted">Saved on this device</p>
				</div>
				<UTooltip :text="UNDO_HINT" :disabled="!showUndoHint">
					<!-- A disabled button fires no pointer events: the wrapper carries the tooltip. -->
					<span class="inline-flex shrink-0 rounded-full">
						<UButton
							icon="i-lucide-undo-2"
							label="Undo"
							color="neutral"
							variant="soft"
							size="sm"
							class="rounded-full"
							:disabled="undoDisabled"
							:aria-describedby="showUndoHint ? undoHintId : undefined"
							@click="emit('undoLast')" />
					</span>
				</UTooltip>
				<span v-if="showUndoHint" :id="undoHintId" class="sr-only">{{ UNDO_HINT }}</span>
			</div>

			<UButton
				v-if="canAddToPlanning"
				icon="i-lucide-list-plus"
				label="Add all to Plan to Watch"
				color="warning"
				variant="soft"
				size="md"
				block
				class="rounded-full"
				:loading="addingAll"
				:disabled="!media.length || addingAll"
				@click="emit('addAllToPlanning')" />
			<!-- A public profile is read-only: say why nothing can be saved and what works instead. -->
			<p v-else class="text-sm text-pretty text-muted" data-planning-sign-in>
				This public profile is read-only.
				<NuxtLink
					:to="signInLink"
					class="font-medium text-primary underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Sign in with AniList to save these to Plan to Watch</NuxtLink>,
				or export your picks.
			</p>

			<div class="grid grid-cols-2 gap-2">
				<UDropdownMenu :items="exportItems" :content="{ align: 'start' }" :disabled="!media.length">
					<UButton
						icon="i-lucide-download"
						:label="canAddToPlanning ? 'Export' : 'Export picks'"
						:color="canAddToPlanning ? 'neutral' : 'primary'"
						:variant="canAddToPlanning ? 'soft' : 'solid'"
						size="sm"
						block
						class="rounded-full"
						:disabled="!media.length" />
				</UDropdownMenu>
				<UButton
					icon="i-lucide-trash-2"
					label="Clear picks"
					color="neutral"
					variant="soft"
					size="sm"
					block
					class="rounded-full"
					:disabled="!canClear || addingAll"
					@click="clearOpen = true" />
			</div>
		</header>

		<UModal
			v-model:open="clearOpen"
			title="Clear your picks?"
			:description="clearDescription">
			<template #footer>
				<UButton
					label="Cancel"
					color="neutral"
					variant="outline"
					class="ms-auto rounded-full"
					@click="clearOpen = false" />
				<UButton label="Clear picks" color="error" class="rounded-full" @click="confirmClear" />
			</template>
		</UModal>

		<div class="max-h-[calc(100svh-12rem)] overflow-y-auto p-3">
			<div
				v-if="!deckMedia.length"
				class="flex min-h-40 flex-col items-center justify-center gap-2 px-5 text-center">
				<div class="flex size-11 items-center justify-center rounded-full bg-elevated">
					<UIcon name="i-lucide-heart" class="size-5 text-muted" aria-hidden="true" />
				</div>
				<p class="text-sm font-medium text-highlighted">No picks yet</p>
				<p class="text-xs leading-relaxed text-muted">Swipe right and your choices will appear here.</p>
			</div>

			<TransitionGroup
				v-else
				name="interested-list"
				tag="div"
				class="space-y-2"
				data-interested-list>
				<article
					v-for="item in deckMedia"
					:key="item.id"
					data-interested-card
					class="group relative isolate flex min-h-20 overflow-hidden rounded-2xl border border-default bg-elevated/60 shadow-sm">
					<a
						:href="getExplorePickUrl(item)"
						target="_blank"
						rel="noopener noreferrer"
						data-interested-image-link
						class="group/image relative w-16 shrink-0 overflow-hidden bg-muted"
						:aria-label="`Open ${getAnimeTitle(item)} on AniList`">
						<NuxtImg
							v-if="cover(item)"
							:src="cover(item)!"
							:alt="`${getAnimeTitle(item)} cover`"
							width="64"
							height="96"
							fit="cover"
							format="webp"
							loading="lazy"
							class="size-full object-cover transition duration-200 group-hover/image:scale-105" />
						<span v-else class="flex size-full items-center justify-center">
							<UIcon name="i-lucide-image-off" class="size-5 text-muted" aria-hidden="true" />
						</span>
						<span
							data-interested-image-overlay
							class="absolute inset-0 flex items-center justify-center bg-black/55 text-white">
							<UIcon name="i-lucide-external-link" class="size-5" aria-hidden="true" />
						</span>
					</a>

					<div class="flex min-w-0 flex-1 items-center gap-2 p-2.5">
						<div class="min-w-0 flex-1">
							<p class="line-clamp-2 text-sm leading-tight font-semibold text-highlighted">
								{{ getAnimeTitle(item) }}
							</p>
							<p class="mt-1 truncate text-[11px] text-muted">
								{{ item.format?.replaceAll("_", " ") || "Anime" }}
								<span v-if="item.seasonYear" aria-hidden="true"> · </span>
								{{ item.seasonYear || "" }}
							</p>
							<UTooltip
								v-if="relationBadge(item)"
								:text="relationBadge(item)!.description">
								<span class="mt-1 inline-flex text-[10px] font-medium text-toned">
									{{ relationBadge(item)!.label }}
								</span>
							</UTooltip>
						</div>

						<div data-list-actions class="flex shrink-0 flex-col items-center gap-1">
							<UTooltip text="Undo interest">
								<UButton
									icon="i-lucide-undo-2"
									aria-label="Undo interest"
									color="error"
									variant="soft"
									size="sm"
									:disabled="addingAll"
									@click="emit('undo', item)" />
							</UTooltip>
							<UTooltip v-if="canAddToPlanning" text="Add to Plan to Watch">
								<UButton
									icon="i-lucide-bookmark-plus"
									aria-label="Add to Plan to Watch"
									color="warning"
									variant="soft"
									size="sm"
									:loading="addingIds.has(item.id)"
									:disabled="addingIds.has(item.id) || addingAll"
									@click="emit('addToPlanning', item)" />
							</UTooltip>
						</div>
					</div>
				</article>
			</TransitionGroup>
		</div>
	</aside>
</template>

<style scoped>
[data-interested-card] {
	transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

[data-interested-card]:hover,
[data-interested-card]:focus-within {
	border-color: var(--ui-border-accented);
	transform: translateY(-1px);
	box-shadow: 0 10px 24px color-mix(in srgb, var(--ui-text) 8%, transparent);
}

[data-interested-image-overlay] {
	opacity: 0;
	transition: opacity 160ms ease;
}

[data-interested-image-link]:hover [data-interested-image-overlay],
[data-interested-image-link]:focus-visible [data-interested-image-overlay] {
	opacity: 1;
}

[data-list-actions] {
	opacity: 0.72;
	transition: opacity 160ms ease;
}

[data-interested-card]:hover [data-list-actions],
[data-interested-card]:focus-within [data-list-actions] {
	opacity: 1;
}

.interested-list-enter-active,
.interested-list-leave-active {
	transition: opacity 220ms ease, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.interested-list-enter-from {
	opacity: 0;
	transform: translateX(1.5rem);
}

.interested-list-leave-to {
	opacity: 0;
	transform: translateX(2rem) scale(0.94);
}

@media (hover: none) {
	[data-list-actions] {
		opacity: 1;
	}
}

@media (prefers-reduced-motion: reduce) {
	[data-interested-card],
	[data-interested-image-overlay],
	[data-list-actions],
	.interested-list-enter-active,
	.interested-list-leave-active {
		transition-duration: 1ms;
	}
}
</style>

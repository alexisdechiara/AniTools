<template>
	<UContextMenu :items="actions" size="sm">
		<VueDraggable
			v-model="modelValue"
			group="tiers"
			:data-tier-lane="laneId"
			draggable="[data-tier-entry]"
			filter="[data-locked='true']"
			class="grid size-full min-h-32 flex-wrap content-start gap-2 p-4"
			:class="nbColClass"
			:disabled="isInspectorEnabled || hasHiddenEntries"
			:animation="90"
			:force-fallback="true"
			:fallback-on-body="true"
			:fallback-tolerance="4"
			:empty-insert-threshold="48"
			ghost-class="tierlist-drag-ghost"
			chosen-class="tierlist-drag-chosen"
			drag-class="tierlist-drag-active"
			:delay="180"
			:delay-on-touch-only="true"
			:touch-start-threshold="5"
			@end="handleDragEnd">
			<AnimeTier
				v-for="entry in filteredEntries"
				:key="entry.media.id"
				:item="entry"
				:lane-id="laneId"
				:move-targets="moveTargets"
				:can-move-earlier="canMoveEarlier(entry)"
				:can-move-later="canMoveLater(entry)"
				:has-previous-lane="hasPreviousLane"
				:has-next-lane="hasNextLane"
				@remove="removeAnime"
				@copy="copyAnime"
				@cut="cutAnime"
				@locked="entry.locked = $event"
				@move="moveAnime(entry, $event)"
				@move-previous-lane="moveToAdjacentLane(entry, -1)"
				@move-next-lane="moveToAdjacentLane(entry, 1)"
				@reorder="reorderAnime(entry, $event)" />
			<slot v-if="filteredEntries.length === 0" name="empty" />
		</VueDraggable>
	</UContextMenu>
</template>

<script lang="ts" setup>
import type { SortableEvent } from "sortablejs"
import { VueDraggable } from "vue-draggable-plus"
import type { TierlistEntry, TierlistLaneId } from "~/types/tierlist"
import { useTierListEntryFilter } from "~/utils/TierListEntryFilter"
import {
	MAX_TIERLIST_ENTRIES_PER_LANE,
	parseTierlistClipboardEntry,
	sanitizeTierlistEntry
} from "~/utils/tierlist-model"

const props = defineProps<{
	laneId: TierlistLaneId
}>()

const modelValue = defineModel<TierlistEntry[]>({ default: () => [] })
const { filterEntry } = useTierListEntryFilter()
const { copy, text, isSupported } = useClipboard()
const toast = useToast()

const tierlistStore = useTierlistStore()
const { nbColClass } = storeToRefs(tierlistStore)
const { isInspectorEnabled } = useInspector()

const filteredEntries = computed(() => modelValue.value.filter(filterEntry))
const hasHiddenEntries = computed(() => filteredEntries.value.length !== modelValue.value.length)
const moveTargets = computed(() => tierlistStore.getMoveTargets(props.laneId))
const hasPreviousLane = computed(() =>
	tierlistStore.getAdjacentLane(props.laneId, -1) !== null
)
const hasNextLane = computed(() =>
	tierlistStore.getAdjacentLane(props.laneId, 1) !== null
)

function getDropPoint(event: Event | undefined): { x: number, y: number } | null {
	if (event instanceof MouseEvent) {
		return { x: event.clientX, y: event.clientY }
	}
	if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
		const touch = event.changedTouches.item(0) ?? event.touches.item(0)
		return touch ? { x: touch.clientX, y: touch.clientY } : null
	}
	return null
}

function handleDragEnd(event: SortableEvent): void {
	const point = getDropPoint(event.originalEvent)
	const mediaId = Number(event.item.dataset.mediaId)
	if (!point || !Number.isInteger(mediaId) || mediaId <= 0) return

	const targetLane = document.elementsFromPoint(point.x, point.y)
		.map(element => element.closest<HTMLElement>("[data-tier-lane]"))
		.find((element): element is HTMLElement => element !== null)
	const targetLaneId = targetLane?.dataset.tierLane
	if (
		!targetLaneId
		|| targetLaneId === props.laneId
		|| (
			targetLaneId !== "unranked"
			&& !tierlistStore.tiers.some(tier => tier.id === targetLaneId)
		)
	) return

	// Sortable handles empty lanes correctly. Its fallback mode can miss a
	// populated CSS grid, so finish that cross-lane move from the drop point.
	tierlistStore.moveEntry(mediaId, props.laneId, targetLaneId)
}

function entryIndex(item: TierlistEntry): number {
	return modelValue.value.findIndex(entry => entry.media.id === item.media.id)
}

function canMoveEarlier(item: TierlistEntry): boolean {
	return entryIndex(item) > 0
}

function canMoveLater(item: TierlistEntry): boolean {
	const index = entryIndex(item)
	return index >= 0 && index < modelValue.value.length - 1
}

function removeAnime(item: TierlistEntry): void {
	tierlistStore.removeEntry(item.media.id, props.laneId)
}

async function copyAnime(item: TierlistEntry): Promise<boolean> {
	const sanitized = sanitizeTierlistEntry(item)
	if (!sanitized) return false

	try {
		await copy(JSON.stringify(sanitized, null, 2))
		toast.add({ title: "Anime copied", color: "success" })
		return true
	} catch {
		toast.add({
			title: "Copy failed",
			description: "Your browser did not grant clipboard access.",
			color: "error"
		})
		return false
	}
}

async function cutAnime(item: TierlistEntry): Promise<void> {
	if (await copyAnime(item)) removeAnime(item)
}

function moveAnime(item: TierlistEntry, targetLaneId: TierlistLaneId): void {
	tierlistStore.moveEntry(item.media.id, props.laneId, targetLaneId)
}

function moveToAdjacentLane(item: TierlistEntry, direction: -1 | 1): void {
	const targetLaneId = tierlistStore.getAdjacentLane(props.laneId, direction)
	if (targetLaneId) moveAnime(item, targetLaneId)
}

function reorderAnime(item: TierlistEntry, direction: -1 | 1): void {
	tierlistStore.reorderEntry(item.media.id, props.laneId, direction)
}

async function readClipboardText(): Promise<string> {
	if (isSupported.value && text.value.trim()) return text.value
	if (!navigator.clipboard?.readText) return ""
	return await navigator.clipboard.readText()
}

async function pasteAnime(): Promise<void> {
	try {
		const clipboardText = await readClipboardText()
		const parsedItem = parseTierlistClipboardEntry(clipboardText)
		if (!parsedItem) {
			toast.add({
				title: "Invalid clipboard content",
				description: "Copy an anime from AniTools before pasting it here.",
				color: "error"
			})
			return
		}
		if (modelValue.value.length >= MAX_TIERLIST_ENTRIES_PER_LANE) {
			toast.add({ title: "This tier is full", color: "error" })
			return
		}
		if (!tierlistStore.addEntryToLane(parsedItem, props.laneId)) {
			toast.add({
				title: "Anime not added",
				description: "It is already present or the tier list reached its size limit.",
				color: "warning"
			})
			return
		}
		toast.add({ title: "Anime pasted", color: "success" })
	} catch {
		toast.add({
			title: "Paste failed",
			description: "Your browser did not grant clipboard access.",
			color: "error"
		})
	}
}

const actions = [
	[
		{
			label: "Paste",
			icon: "i-lucide-clipboard-paste",
			onClick: pasteAnime
		}
	],
	[
		{
			label: "Clear tier",
			color: "error" as const,
			icon: "i-lucide-brush-cleaning",
			onClick: () => {
				if (window.confirm("Clear every anime from this tier? This cannot be undone.")) {
					modelValue.value = []
				}
			}
		}
	]
]
</script>

<style scoped>
:deep(.tierlist-drag-ghost) {
	opacity: 0.25;
}

:global(.tierlist-drag-chosen),
:global(.tierlist-drag-active) {
	z-index: 100 !important;
	cursor: grabbing;
	transition: none !important;
	will-change: transform;
}
</style>

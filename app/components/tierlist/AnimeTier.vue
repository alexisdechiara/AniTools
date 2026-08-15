<template>
	<div
		class="group relative z-20 aspect-3/4 h-fit w-full transition-all duration-100 ease-out focus-within:z-50 hover:z-50 focus-visible:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
		:class="[
			!item.locked && !isInspectorEnabled ? 'hover:scale-102' : '',
			hoveredTarget?.id === mediaId && hoveredTarget?.type === 'anime'
				? 'cursor-pointer ring-2 ring-primary ring-offset-2 ring-offset-default'
				: ''
		]"
		data-tier-entry
		:data-media-id="item.media.id"
		:data-locked="item.locked ? 'true' : undefined"
		:aria-label="`${title}. Use arrow keys to reorder or change tier.`"
		tabindex="0"
		@click.stop="selectItem"
		@mouseover.stop="setHovered(mediaId, 'anime', 'Anime')"
		@mouseleave="clearHovered"
		@keydown="handleKeydown">
		<UContextMenu :items="actions" size="sm">
			<NuxtImg
				sizes="96px"
				loading="lazy"
				decoding="async"
				:src="coverUrl"
				:alt="title"
				class="size-full rounded-lg object-cover" />
			<div
				v-if="!isInspectorEnabled"
				class="visible absolute top-0 -right-4 z-60 flex h-fit flex-col gap-0.5 opacity-100 transition-opacity duration-250 ease-in md:invisible md:opacity-0 md:group-focus-within:visible md:group-focus-within:opacity-100 md:group-hover:visible md:group-hover:opacity-100">
				<UDropdownMenu
					:items="actions"
					size="sm"
					:content="{ align: 'start', side: 'right', sideOffset: 8 }">
					<UButton
						icon="i-lucide-ellipsis-vertical"
						color="neutral"
						variant="solid"
						size="xs"
						:aria-label="`Actions for ${title}`"
						class="cursor-pointer rounded-full" />
				</UDropdownMenu>
				<AnimeDetailsPopover
					v-model:open="showDetails"
					:data="item"
					orientation="vertical">
					<UButton
						icon="i-lucide-info"
						color="neutral"
						variant="solid"
						size="xs"
						:aria-label="`Show details for ${title}`"
						class="cursor-pointer rounded-full" />
				</AnimeDetailsPopover>
				<UButton
					icon="i-lucide-trash"
					color="error"
					variant="solid"
					size="xs"
					:aria-label="`Remove ${title}`"
					class="cursor-pointer rounded-full"
					@click.stop="removeAnime" />
			</div>
		</UContextMenu>
		<div
			v-if="!isInspectorEnabled"
			class="pointer-events-none absolute inset-0 z-40 rounded-lg bg-linear-to-t from-neutral-950/60 from-0% via-neutral-950/40 via-10% to-neutral-950/10 to-25% opacity-0 transition-all duration-100 ease-in-out group-focus-within:opacity-100 group-hover:opacity-100"
			:class="item.locked ? 'cursor-not-allowed' : 'cursor-move'" />
		<span
			class="pointer-events-none invisible absolute inset-x-2 bottom-2 z-50 text-[10px] font-medium text-white group-focus-within:visible group-hover:visible"
			:class="isInspectorEnabled ? 'cursor-pointer' : 'cursor-move'">
			{{ title }}
		</span>
	</div>
</template>

<script lang="ts" setup>
import type {
	TierlistEntry,
	TierlistLaneId,
	TierlistMoveTarget
} from "~/types/tierlist"
import { getTierlistEntryTitle } from "~/utils/tierlist-model"

const props = defineProps<{
	item: TierlistEntry
	laneId: TierlistLaneId
	moveTargets: TierlistMoveTarget[]
	canMoveEarlier: boolean
	canMoveLater: boolean
	hasPreviousLane: boolean
	hasNextLane: boolean
}>()

const emit = defineEmits<{
	remove: [item: TierlistEntry]
	copy: [item: TierlistEntry]
	cut: [item: TierlistEntry]
	locked: [locked: boolean]
	move: [targetLaneId: TierlistLaneId]
	movePreviousLane: []
	moveNextLane: []
	reorder: [direction: -1 | 1]
}>()

const { isInspectorEnabled, setHovered, clearHovered, selectItem, hoveredTarget } = useInspector()
const showDetails = ref(false)
const mediaId = computed(() => String(props.item.media.id))
const title = computed(() => getTierlistEntryTitle(props.item))
const coverUrl = computed(() =>
	props.item.media.coverImage?.extraLarge
	?? props.item.media.coverImage?.large
	?? props.item.media.coverImage?.medium
	?? ""
)

function removeAnime(): void {
	emit("remove", props.item)
}

function handleKeydown(event: KeyboardEvent): void {
	switch (event.key) {
		case "ArrowLeft":
			if (!props.item.locked && props.canMoveEarlier) {
				event.preventDefault()
				emit("reorder", -1)
			}
			break
		case "ArrowRight":
			if (!props.item.locked && props.canMoveLater) {
				event.preventDefault()
				emit("reorder", 1)
			}
			break
		case "ArrowUp":
			if (!props.item.locked && props.hasPreviousLane) {
				event.preventDefault()
				emit("movePreviousLane")
			}
			break
		case "ArrowDown":
			if (!props.item.locked && props.hasNextLane) {
				event.preventDefault()
				emit("moveNextLane")
			}
			break
		case "Delete":
		case "Backspace":
			event.preventDefault()
			removeAnime()
			break
	}
}

const actions = computed(() => [
	[
		{
			label: "Details",
			icon: "i-lucide-info",
			onClick: () => {
				showDetails.value = true
			}
		}
	],
	[
		{
			label: "Move to",
			icon: "i-lucide-move",
			disabled: props.item.locked || props.moveTargets.length === 0,
			children: props.moveTargets.map(target => ({
				label: target.label,
				onClick: () => emit("move", target.id)
			}))
		},
		{
			label: "Move earlier",
			icon: "i-lucide-arrow-left",
			disabled: props.item.locked || !props.canMoveEarlier,
			onClick: () => emit("reorder", -1)
		},
		{
			label: "Move later",
			icon: "i-lucide-arrow-right",
			disabled: props.item.locked || !props.canMoveLater,
			onClick: () => emit("reorder", 1)
		}
	],
	[
		{
			label: "Lock",
			icon: "i-lucide-lock",
			checked: props.item.locked,
			type: "checkbox" as const,
			onUpdateChecked: (checked: boolean) => emit("locked", checked)
		},
		{
			label: "Copy",
			icon: "i-lucide-copy",
			onClick: () => emit("copy", props.item)
		},
		{
			label: "Cut",
			icon: "i-lucide-scissors",
			onClick: () => emit("cut", props.item)
		}
	],
	[
		{
			label: "Delete",
			color: "error" as const,
			icon: "i-lucide-trash",
			onClick: removeAnime
		}
	]
])
</script>

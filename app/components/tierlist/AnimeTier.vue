<template>
	<div class="relative h-fit w-full aspect-3/4 group transition-all duration-100 ease-out z-20 pointer-events-auto"
		:class="[item.locked ? 'locked-item' : (!isInspectorEnabled ? 'hover:scale-102' : ''), (hoveredTarget?.id === item.id && hoveredTarget?.type === 'anime') ? 'ring-2 ring-primary ring-offset-2 ring-offset-background cursor-pointer' : '']"
		:draggable="!item.locked" @dragstart="handleDragStart" @dragend="handleDragEnd" @click.stop="selectItem"
		@mouseover.stop="setHovered(item.id, 'anime', 'Anime')" @mouseleave="clearHovered">
		<UContextMenu :items="actions" size="sm" :key="`context-${item.id}-${item.locked}`">
			<NuxtImg sizes="96px" loading="lazy" decoding="async"
				:src="item.media?.coverImage?.extraLarge || item.media?.coverImage?.large || item.media?.coverImage?.medium"
				class="size-full object-cover rounded-lg" />
			<div v-if="!isInspectorEnabled"
				class="absolute h-fit top-0 -right-4 gap-0.5 flex flex-col opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-250 ease-in">
				<UDropdownMenu :items="actions" size="sm" :content="{
					align: 'start',
					side: 'right',
					sideOffset: 8
				}">
					<UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="solid" size="xs"
						class="rounded-full cursor-pointer transform scale-90 hover:scale-100 transition-all duration-100 ease-in delay-50 opacity-0 group-hover:opacity-100" />
				</UDropdownMenu>
				<AnimeDetailsPopover v-model:open="showDetails" :data="item" orientation="vertical" draggable>
					<UButton icon="i-lucide-info" color="neutral" variant="solid" size="xs"
						class="rounded-full cursor-pointer transform scale-90 hover:scale-100 transition-all duration-100 ease-in delay-100 opacity-0 group-hover:opacity-100" />
				</AnimeDetailsPopover>
				<UButton icon="i-lucide-trash" color="error" variant="solid" size="xs"
					class="rounded-full cursor-pointer transform scale-90 hover:scale-100 transition-all duration-100 ease-in delay-150 opacity-0 group-hover:opacity-100"
					@click.stop="removeAnime" />
			</div>
		</UContextMenu>
		<div v-if="!isInspectorEnabled"
			class="rounded-lg transition-all duration-100 ease-in-out opacity-0 group-hover:opacity-100 absolute inset-0 z-40 bg-linear-to-t from-0% from-neutral-950/60 via-10% via-neutral-950/40 to-25% to-neutral-950/10"
			:class="item.locked ? 'cursor-not-allowed' : 'cursor-move'" />
		<span
class="invisible group-hover:visible absolute inset-x-2 bottom-2 font-medium text-white z-50 text-[10px]"
			:class="isInspectorEnabled ? 'cursor-pointer' : 'cursor-move'">
			{{ item.media?.title?.userPreferred }}
		</span>
	</div>
</template>

<script lang="ts" setup>
const props = defineProps<{
	item: any
}>()

const { isInspectorEnabled, setHovered, clearHovered, selectItem, hoveredTarget } = useInspector()

const emit = defineEmits<{
	remove: [item: any]
	copy: [item: any]
	cut: [item: any]
	locked: [boolean]
	dragStart: [item: any]
}>()

const showDetails = ref(false)

function toggleLock() {
	props.item.locked = !props.item.locked
}

function removeAnime() {
	emit('remove', props.item)
}

function copyAnime() {
	emit('copy', props.item)
}

function cutAnime() {
	emit('cut', props.item)
}

function handleDragStart(event: DragEvent) {
	if (props.item.locked) {
		event.preventDefault()
		return
	}

	// Stocker les données de l'anime dans le drag event
	event.dataTransfer?.setData('application/json', JSON.stringify(props.item))
	event.dataTransfer?.setData('text/plain', props.item.media?.title?.userPreferred || 'Unknown anime')

	// Ajouter un effet visuel
	event.dataTransfer!.effectAllowed = 'move'

	// Émettre l'événement pour notifier le parent
	emit('dragStart', props.item)
}

function handleDragEnd(event: DragEvent) {
	// Nettoyer si nécessaire
}

const actions = computed(() => [
	[
		{
			label: 'Details',
			icon: 'i-lucide-info',
			disabled: true,
			onClick(e: Event) {
				e.stopPropagation()
				e.preventDefault()
				showDetails.value = true
			}
		}
	],
	[
		{
			label: 'Lock',
			icon: 'i-lucide-lock',
			checked: props.item.locked,
			type: 'checkbox' as const,
			onUpdateChecked(checked: boolean) {
				emit('locked', checked)
			},
		},
		{
			label: 'Copy',
			icon: 'i-lucide-copy',
			onClick(e: Event) {
				copyAnime()
			}
		},
		{
			label: 'Cut',
			icon: 'i-lucide-scissors',
			onClick(e: Event) {
				cutAnime()
			}
		}
	],
	[
		{
			label: 'Delete',
			color: 'error' as const,
			icon: 'i-lucide-trash',
			onClick(e: Event) {
				removeAnime()
			}
		}
	]
])

</script>

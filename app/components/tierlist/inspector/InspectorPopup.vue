<template>
	<UPopover v-model:open="inspectorState.isOpen" :reference="referenceRef" :ui="{ content: 'overflow-hidden min-w-xs' }"
		:content="{ side: 'bottom', align: 'start', updatePositionStrategy: 'always' }">
		<template #content>
			<div ref="popupEl" class="bg-default divide-y divide-default flex flex-col focus:outline-none size-full">
				<div class="flex items-center justify-between gap-1.5 p-4 sm:px-6 min-h-16">
					<span class="text-sm font-semibold capitalize">Customize {{ inspectorState.targetName }}</span>
					<Icon name="i-lucide-grip-vertical"
						class="text-muted hover:text-muted-foreground cursor-grab active:cursor-grabbing z-50"
						@mousedown.stop="startDrag" />
				</div>
				<div class="flex-1 p-4 sm:p-6">
					<SettingsTierRow v-if="inspectorState.type === 'row'" />
					<SettingsTierHeader v-if="inspectorState.type === 'header'" />
					<SettingsTierContent v-if="inspectorState.type === 'content'" />
					<div v-if="inspectorState.type === 'anime'">
						<p class="text-xs text-muted">No specific settings for anime yet.</p>
					</div>
				</div>
			</div>
		</template>
	</UPopover>
</template>

<script setup lang="ts">
import SettingsTierRow from '~/components/tierlist/settings/SettingsTierRow.vue'
import SettingsTierHeader from '~/components/tierlist/settings/SettingsTierHeader.vue'
import SettingsTierContent from '~/components/tierlist/settings/SettingsTierContent.vue'

const { inspectorState } = useInspector()
const popupEl = ref<HTMLElement | null>(null)

// Memoized virtual reference to prevent unnecessary recalculations
const referenceRef = computed(() => {
	const pos = inspectorState.value.position
	return {
		getBoundingClientRect: () => ({
			width: 0,
			height: 0,
			left: pos.x,
			right: pos.x,
			top: pos.y,
			bottom: pos.y,
			x: pos.x,
			y: pos.y,
		} as DOMRect)
	}
})

/* Optimized Draggable Logic */
const isDragging = ref(false)
const popupOffset = reactive({ x: 0, y: 0 })
const dragStart = reactive({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 })

// Use refs for better cleanup
const boundDragMove = ref<((e: MouseEvent) => void) | null>(null)
const boundDragStop = ref<(() => void) | null>(null)

function startDrag(event: MouseEvent) {
	if (!popupEl.value) return
	const panel = popupEl.value.parentElement
	if (!panel) return

	event.preventDefault()

	dragStart.mouseX = event.clientX
	dragStart.mouseY = event.clientY
	dragStart.startX = popupOffset.x
	dragStart.startY = popupOffset.y

	isDragging.value = true

	boundDragMove.value = (e: MouseEvent) => onDragMove(e)
	boundDragStop.value = () => stopDrag()

	window.addEventListener('mousemove', boundDragMove.value)
	window.addEventListener('mouseup', boundDragStop.value, { once: true })
}

function onDragMove(event: MouseEvent) {
	if (!isDragging.value) return

	const dx = event.clientX - dragStart.mouseX
	const dy = event.clientY - dragStart.mouseY

	popupOffset.x = dragStart.startX + dx
	popupOffset.y = dragStart.startY + dy

	// Use transform instead of translate for better performance
	requestAnimationFrame(() => {
		const panel = popupEl.value?.parentElement
		if (panel) {
			panel.style.transform = `translate(${popupOffset.x}px, ${popupOffset.y}px)`
		}
	})
}

function stopDrag() {
	isDragging.value = false

	if (boundDragMove.value) {
		window.removeEventListener('mousemove', boundDragMove.value)
		boundDragMove.value = null
	}

	boundDragStop.value = null
}

// Cleanup on unmount
onUnmounted(() => {
	if (boundDragMove.value) {
		window.removeEventListener('mousemove', boundDragMove.value)
	}
})
</script>

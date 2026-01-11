<template>
	<UContextMenu :items="actions" size="sm">
		<VueDraggable v-model="modelValue" group="tiers" :filter="'.locked-item'" class="grid size-full flex-wrap p-4 gap-2"
			:class="[nbColClass, bodyColWidthClass]" :disabled="isInspectorEnabled">
			<AnimeTier v-for="(entry, index) in filteredEntries" :key="entry.id" :item="entry" @remove="removeAnime"
				@copy="copyAnime" @cut="cutAnime" @locked="entry.locked = $event" @dragStart="handleDragStart" />
		</VueDraggable>
	</UContextMenu>
</template>

<script lang="ts" setup>
import { VueDraggable } from "vue-draggable-plus"
import { useTierListEntryFilter } from "~/utils/TierListEntryFilter"

const modelValue = defineModel<any>()

const { filterEntry } = useTierListEntryFilter()
const { copy, text, isSupported } = useClipboard()

const tierlistStore = useTierlistStore()
const { nbColClass, bodyColWidthClass } = storeToRefs(tierlistStore)
const { isInspectorEnabled } = useInspector()

const filteredEntries = computed(() => {
	return modelValue.value.filter((entry: any) => filterEntry(entry))
})

function removeAnime(item: any) {
	const index = modelValue.value.findIndex((entry: any) => entry === item)
	if (index > -1) {
		modelValue.value.splice(index, 1)
	}
}

function copyAnime(item: any) {
	copy(JSON.stringify(item, null, 2))
	console.log('Copied anime:', item)
}

function cutAnime(item: any) {
	copy(JSON.stringify(item, null, 2))
	removeAnime(item)
	console.log('Cut anime:', item)
}

function handleDragStart(item: any) {
	// Stocker l'item draggé pour pouvoir le supprimer si drop réussi
	draggedItem.value = item
}

const draggedItem = ref<any>(null)

async function pasteAnime() {
	try {
		if (isSupported.value && text.value) {
			console.log('Using useClipboard, text:', text.value)

			if (!text.value.trim()) {
				console.log('useClipboard text is empty or whitespace')
				await tryNativeClipboard()
				return
			}

			const parsedItem = JSON.parse(text.value)
			if (parsedItem && (parsedItem.id || parsedItem.media)) {
				modelValue.value.push({ ...parsedItem, id: Date.now().toString() })
				console.log('Pasted anime (useClipboard):', parsedItem)
			} else {
				console.log('Invalid item format in useClipboard')
			}
		} else {
			await tryNativeClipboard()
		}
	} catch (error) {
		console.error('useClipboard failed, trying native:', error)
		await tryNativeClipboard()
	}
}

async function tryNativeClipboard() {
	try {
		if (navigator.clipboard && navigator.clipboard.readText) {
			const clipboardText = await navigator.clipboard.readText()
			console.log('Native clipboard text:', clipboardText)

			if (!clipboardText.trim()) {
				console.log('Native clipboard is empty or whitespace')
				return
			}

			const parsedItem = JSON.parse(clipboardText)
			if (parsedItem && (parsedItem.id || parsedItem.media)) {
				modelValue.value.push({ ...parsedItem, id: Date.now().toString() })
				console.log('Pasted anime (native):', parsedItem)
			} else {
				console.log('Invalid item format in native clipboard')
			}
		}
	} catch (error) {
		console.error('Native clipboard also failed:', error)
	}
}

const actions = [
	[
		{
			label: 'Paste',
			icon: 'i-lucide-clipboard-paste',
			onClick(e: Event) {
				pasteAnime()
			}
		}
	],
	[
		{
			label: 'Clear',
			color: 'error' as const,
			icon: 'i-lucide-brush-cleaning',
			onClick(e: Event) {
				modelValue.value = []
			}
		}
	]
]

</script>

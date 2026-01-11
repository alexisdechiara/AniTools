import { useEventListener, useThrottleFn, useRafFn } from "@vueuse/core"

export type InspectorType = "row" | "header" | "content" | "anime" | null

export interface InspectorState {
	isOpen: boolean
	type: InspectorType
	position: { x: number, y: number }
	targetId?: string
	targetName?: string
}

export const useInspector = () => {
	const isInspectorEnabled = useState<boolean>("inspector-enabled", () => false)

	// Global state for popup - needs to persist across components
	const inspectorState = useState<InspectorState>("inspector-state", () => ({
		isOpen: false,
		type: null,
		position: { x: 0, y: 0 },
		targetId: undefined,
		targetName: ""
	}))

	// Local refs for high-frequency updates - using regular ref for reactivity
	const hoveredTarget = ref<{ id: string, type: InspectorType, name: string } | null>(null)
	const cursorPosition = ref({ x: 0, y: 0 })
	const inspectorActivatedAt = ref(0)

	// RAF-based cursor update for smoother performance
	const { pause: pauseCursor, resume: resumeCursor } = useRafFn(() => {
		if (!isInspectorEnabled.value) return
		// Cursor position is updated via mousemove event
	}, { immediate: false })

	const toggleInspector = () => {
		const newValue = !isInspectorEnabled.value
		isInspectorEnabled.value = newValue

		if (!newValue) {
			hoveredTarget.value = null
			pauseCursor()
		} else {
			inspectorActivatedAt.value = Date.now()
			resumeCursor()
		}
	}

	const setHovered = (id: string, type: InspectorType, name: string) => {
		if (!isInspectorEnabled.value) return
		hoveredTarget.value = { id, type, name }
	}

	const clearHovered = () => {
		if (!isInspectorEnabled.value) return
		hoveredTarget.value = null
	}

	const selectItem = (event: MouseEvent) => {
		if (!isInspectorEnabled.value || !hoveredTarget.value) return

		event.stopPropagation()
		event.preventDefault()

		inspectorState.value = {
			isOpen: true,
			type: hoveredTarget.value.type,
			targetId: hoveredTarget.value.id,
			targetName: hoveredTarget.value.name,
			position: { x: event.clientX, y: event.clientY }
		}

		// Disable inspector mode after selection
		isInspectorEnabled.value = false
		hoveredTarget.value = null
		pauseCursor()
	}

	const closeInspector = () => {
		inspectorState.value.isOpen = false
		inspectorState.value.type = null
	}

	const initializeInspector = () => {
		useEventListener(window, "keydown", (e) => {
			if (e.key === "Escape" && isInspectorEnabled.value) {
				toggleInspector()
			}
		})

		// Optimized cursor update with RAF
		const updateCursor = useThrottleFn((e: MouseEvent) => {
			cursorPosition.value = { x: e.clientX, y: e.clientY }
		}, 8) // ~120fps for smoother tracking

		useEventListener(window, "mousemove", (e) => {
			if (isInspectorEnabled.value) {
				updateCursor(e)
			}
		})

		// Click outside to disable inspector (with delay to avoid conflicts)
		useEventListener(window, "click", (_e) => {
			// Use setTimeout to allow selectItem to be called first
			setTimeout(() => {
				// Don't disable if inspector was just activated (within 500ms)
				const timeSinceActivation = Date.now() - inspectorActivatedAt.value
				if (isInspectorEnabled.value && !hoveredTarget.value && timeSinceActivation > 500) {
					// Click outside any inspectable element
					toggleInspector()
				}
			}, 50)
		})
	}

	return {
		isInspectorEnabled,
		inspectorState,
		hoveredTarget,
		cursorPosition,
		toggleInspector,
		setHovered,
		clearHovered,
		selectItem,
		closeInspector,
		initializeInspector
	}
}

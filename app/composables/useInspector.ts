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
	const inspectorState = useState<InspectorState>("inspector-state", () => ({
		isOpen: false,
		type: null,
		position: { x: 0, y: 0 },
		targetId: undefined,
		targetName: ""
	}))

	const hoveredTarget = useState<{ id: string, type: InspectorType, name: string } | null>("inspector-hovered", () => null)
	const cursorPosition = useState<{ x: number, y: number }>("inspector-cursor", () => ({ x: 0, y: 0 }))
	const inspectorActivatedAt = useState<number>("inspector-activated-at", () => 0)

	const { pause: pauseCursor, resume: resumeCursor } = useRafFn(() => {
		if (!isInspectorEnabled.value) return
	}, { immediate: false })

	const toggleInspector = () => {
		const enabled = !isInspectorEnabled.value
		isInspectorEnabled.value = enabled

		if (!enabled) {
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

		const updateCursor = useThrottleFn((e: MouseEvent) => {
			cursorPosition.value = { x: e.clientX, y: e.clientY }
		}, 8)

		useEventListener(window, "mousemove", (e) => {
			if (isInspectorEnabled.value) {
				updateCursor(e)
			}
		})

		useEventListener(window, "click", (_e) => {
			setTimeout(() => {
				const timeSinceActivation = Date.now() - inspectorActivatedAt.value
				if (isInspectorEnabled.value && !hoveredTarget.value && timeSinceActivation > 200) {
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

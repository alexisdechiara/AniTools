import { useEventListener, useThrottleFn } from "@vueuse/core"

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

	const toggleInspector = () => {
		const enabled = !isInspectorEnabled.value
		isInspectorEnabled.value = enabled

		if (!enabled) {
			hoveredTarget.value = null
		} else {
			inspectorActivatedAt.value = Date.now()
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

	// Pointer activation carries its own coordinates; keyboard activation falls back
	// to the centre of the element that was focused.
	const activationPosition = (event: MouseEvent | KeyboardEvent): { x: number, y: number } => {
		if (event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0)) {
			return { x: event.clientX, y: event.clientY }
		}

		const target = event.currentTarget
		if (target instanceof HTMLElement) {
			const rect = target.getBoundingClientRect()
			return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
		}

		return { ...cursorPosition.value }
	}

	const selectItem = (event: MouseEvent | KeyboardEvent) => {
		if (!isInspectorEnabled.value || !hoveredTarget.value) return

		event.stopPropagation()
		event.preventDefault()

		inspectorState.value = {
			isOpen: true,
			type: hoveredTarget.value.type,
			targetId: hoveredTarget.value.id,
			targetName: hoveredTarget.value.name,
			position: activationPosition(event)
		}

		isInspectorEnabled.value = false
		hoveredTarget.value = null
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

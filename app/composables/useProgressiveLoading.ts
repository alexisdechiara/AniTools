import {
	computed,
	onBeforeUnmount,
	onMounted,
	ref,
	toValue,
	watch,
	type MaybeRefOrGetter
} from "vue"
import { getProgressiveLoadingPhase } from "~/utils/loading-state"

interface ProgressiveLoadingOptions {
	allowPartial?: boolean
	cycleKey?: MaybeRefOrGetter<unknown>
	layoutReady?: MaybeRefOrGetter<boolean>
	minimumDuration?: number
	partialRevealDelay?: number
}

export function useProgressiveLoading(
	readyStates: MaybeRefOrGetter<readonly boolean[]>,
	options: ProgressiveLoadingOptions = {}
) {
	const mounted = ref(false)
	const minimumElapsed = ref(false)
	const partialRevealElapsed = ref(false)
	let minimumTimer: ReturnType<typeof setTimeout> | undefined
	let partialTimer: ReturnType<typeof setTimeout> | undefined

	function clearTimers() {
		if (minimumTimer) clearTimeout(minimumTimer)
		if (partialTimer) clearTimeout(partialTimer)
		minimumTimer = undefined
		partialTimer = undefined
	}

	function startCycle() {
		clearTimers()
		minimumElapsed.value = false
		partialRevealElapsed.value = false
		minimumTimer = setTimeout(() => {
			minimumElapsed.value = true
		}, options.minimumDuration ?? 420)
		partialTimer = setTimeout(() => {
			partialRevealElapsed.value = true
		}, options.partialRevealDelay ?? 1_100)
	}

	onMounted(() => {
		mounted.value = true
		startCycle()
	})

	if (options.cycleKey !== undefined) {
		watch(() => toValue(options.cycleKey!), () => {
			if (mounted.value) startCycle()
		})
	}

	onBeforeUnmount(clearTimers)

	const phase = computed(() => getProgressiveLoadingPhase({
		allowPartial: options.allowPartial ?? true,
		layoutReady: mounted.value && toValue(options.layoutReady ?? true),
		minimumElapsed: minimumElapsed.value,
		partialRevealElapsed: partialRevealElapsed.value,
		readyStates: toValue(readyStates)
	}))

	return {
		phase,
		showPageLoader: computed(() => phase.value === "page")
	}
}

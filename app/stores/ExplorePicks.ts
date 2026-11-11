import { defineStore } from "pinia"
import type { AniListMediaSummary } from "~~/shared/types/anilist"
import {
	EXPLORE_PICKS_STORAGE_KEY,
	addExplorePass,
	addExplorePick,
	createEmptyExplorePicksProfile,
	createEmptyExplorePicksState,
	dropListedExplorePicks,
	getExplorePicksProfile,
	getProfileIdentityKey,
	parseExplorePicksState,
	restoreExploreDecision,
	serializeExplorePicksState,
	setExplorePicksProfile,
	type ExplorePickMedia,
	type ExplorePicksProfile,
	type ExplorePicksState
} from "~/utils/explore-picks"

export const EXPLORE_PICKS_WRITE_DELAY_MS = 250

/**
 * The Explore "Interested" picks and passed titles of the current profile, kept in
 * `localStorage`. Not persisted through pinia-plugin-persistedstate: that plugin hydrates at
 * store creation, which would make the first client render differ from the server one. The page
 * calls `load()` after mount instead, and nothing is written before that read.
 */
export const useExplorePicksStore = defineStore("ExplorePicks", () => {
	const user = useUserStore()
	const interested = ref<ExplorePickMedia[]>([])
	const passed = ref<number[]>([])
	const loadedIdentity = ref<string | null>(null)
	const isHydrated = ref(false)
	let updatedAt = 0
	let activated = false
	let listeningForPageHide = false
	let writeTimer: ReturnType<typeof setTimeout> | null = null

	const identity = computed(() => getProfileIdentityKey({
		isAuthenticated: user.isAuthenticated,
		authMode: user.authMode,
		username: user.getUsername
	}))

	/** Every title the swipe queue must skip: picked or passed. */
	const decidedIds = computed(() => new Set([
		...passed.value,
		...interested.value.map(media => media.id)
	]))

	function currentProfile(): ExplorePicksProfile {
		return { updatedAt, interested: interested.value, passed: passed.value }
	}

	function apply(profile: ExplorePicksProfile) {
		interested.value = profile.interested
		passed.value = profile.passed
		updatedAt = profile.updatedAt
	}

	function readState(): ExplorePicksState {
		try {
			return parseExplorePicksState(localStorage.getItem(EXPLORE_PICKS_STORAGE_KEY))
		} catch {
			return createEmptyExplorePicksState()
		}
	}

	function persist() {
		if (!import.meta.client || !isHydrated.value || !loadedIdentity.value) return

		try {
			// Read again before writing: another tab may have saved another profile meanwhile.
			const nextState = setExplorePicksProfile(readState(), loadedIdentity.value, currentProfile())
			if (Object.keys(nextState.profiles).length === 0) {
				localStorage.removeItem(EXPLORE_PICKS_STORAGE_KEY)
			} else {
				localStorage.setItem(EXPLORE_PICKS_STORAGE_KEY, serializeExplorePicksState(nextState))
			}
		} catch {
			// Storage unavailable or full: the picks keep working for this session.
		}
	}

	function cancelPendingWrite(): boolean {
		if (writeTimer === null) return false
		clearTimeout(writeTimer)
		writeTimer = null
		return true
	}

	/** Writes a pending change immediately. */
	function flush() {
		if (cancelPendingWrite()) persist()
	}

	function schedulePersist() {
		if (!import.meta.client || !isHydrated.value) return
		cancelPendingWrite()
		writeTimer = setTimeout(() => {
			writeTimer = null
			persist()
		}, EXPLORE_PICKS_WRITE_DELAY_MS)
	}

	function update(change: (profile: ExplorePicksProfile) => ExplorePicksProfile) {
		const current = currentProfile()
		const next = change(current)
		if (next === current) return
		apply(next)
		schedulePersist()
	}

	/**
	 * Shows the saved picks of `nextIdentity` (the current profile by default). It replaces what
	 * is visible and never merges, so one profile cannot see another one's picks.
	 */
	function load(nextIdentity: string | null = identity.value) {
		if (!import.meta.client) return

		// A pending change belongs to the profile that was visible until now.
		flush()
		activated = true

		if (!listeningForPageHide) {
			listeningForPageHide = true
			// A reload inside the debounce window must not lose the last swipe.
			window.addEventListener("pagehide", flush)
		}

		if (!nextIdentity) {
			apply(createEmptyExplorePicksProfile())
			loadedIdentity.value = null
			isHydrated.value = false
			return
		}

		apply(getExplorePicksProfile(readState(), nextIdentity))
		loadedIdentity.value = nextIdentity
		isHydrated.value = true
	}

	// Synchronous so no swipe can land in the previous profile after a switch.
	watch(identity, (nextIdentity) => {
		if (activated && nextIdentity !== loadedIdentity.value) load(nextIdentity)
	}, { flush: "sync" })

	function pick(media: AniListMediaSummary | ExplorePickMedia) {
		update(profile => addExplorePick(profile, media, Date.now()))
	}

	function pass(mediaId: number) {
		update(profile => addExplorePass(profile, mediaId, Date.now()))
	}

	/** Forgets the decision on a title, picked or passed. */
	function restore(mediaId: number) {
		update(profile => restoreExploreDecision(profile, mediaId, Date.now()))
	}

	/** Drops the picks that are now on the user's AniList list. */
	function removeListed(listedMediaIds: ReadonlySet<number>) {
		update(profile => dropListedExplorePicks(profile, listedMediaIds, Date.now()))
	}

	/** Forgets the passed titles of the current profile and keeps its picks. */
	function clearPassed() {
		update(profile => profile.passed.length === 0
			? profile
			: { updatedAt: Date.now(), interested: profile.interested, passed: [] })
	}

	/** Forgets the picks and passes of the current profile only. */
	function clear() {
		cancelPendingWrite()
		apply(createEmptyExplorePicksProfile(Date.now()))
		persist()
	}

	/** Forgets the picks and passes of every profile saved on this device. */
	function clearAll() {
		cancelPendingWrite()
		apply(createEmptyExplorePicksProfile(Date.now()))
		if (!import.meta.client) return

		try {
			localStorage.removeItem(EXPLORE_PICKS_STORAGE_KEY)
		} catch {
			// Nothing to remove when storage is unavailable.
		}
	}

	return {
		interested,
		passed,
		decidedIds,
		identity,
		loadedIdentity,
		isHydrated,
		load,
		pick,
		pass,
		restore,
		removeListed,
		clearPassed,
		clear,
		clearAll,
		flush
	}
})

// Cache simple pour stocker les résultats
const cache = new Map<string, unknown>()

export const useAiringSchedules = () => {
	// État réactif pour le calendrier
	const vueCalRef = ref()
	const timeStep = ref(20)
	const airingAtGreater = ref<number>()
	const airingAtLesser = ref<number>()

	const updateDateRange = (start: number, end: number) => {
		airingAtGreater.value = start
		airingAtLesser.value = end
	}

	// Gérer Ctrl + scroll pour modifier le time step
	const handleWheel = (event: WheelEvent) => {
		if (event.ctrlKey) {
			event.preventDefault()

			// Augmenter ou réduire le time step
			if (event.deltaY < 0) {
				// Scroll up - augmenter la précision (réduire le time step)
				timeStep.value = Math.max(5, timeStep.value - 5)
			} else {
				// Scroll down - réduire la précision (augmenter le time step)
				timeStep.value = Math.min(120, timeStep.value + 5)
			}
		}
	}

	// Centrer le calendrier sur l'heure actuelle lorsqu'il est prêt
	const onCalendarReady = () => {
		nextTick(() => {
			if (vueCalRef.value) {
				vueCalRef.value.view.scrollToCurrentTime()
			}
		})
	}

	// Gérer le changement de vue du calendrier
	const refreshView = (view: any) => {
		// Obtenir la plage de dates de la vue actuelle
		const startDate = view.extendedStart
		const endDate = view.extendedEnd

		// Convertir en timestamps Unix
		const startTimestamp = Math.floor(startDate.getTime() / 1000)
		const endTimestamp = Math.floor(endDate.getTime() / 1000)

		// Mettre à jour les variables réactives
		updateDateRange(startTimestamp, endTimestamp)
	}

	// Layout des événements
	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
	const EVENT_NARROW_WIDTH = 120
	const EVENT_TINY_WIDTH = 92
	const eventHeights = reactive<Record<string, number>>({})
	const eventWidths = reactive<Record<string, number>>({})
	const eventCardElements = new Map<string, HTMLElement>()
	const elementToEventKey = new WeakMap<Element, string>()
	const eventResizeObserver = shallowRef<ResizeObserver | null>(null)

	const getEventKey = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => {
		const start = new Date(event.start).getTime()
		const end = new Date(event.end).getTime()
		const mediaId = event.media?.id ?? event.id ?? ""
		return `${mediaId}-${start}-${end}-${event.title ?? ""}`
	}

	const setEventCardRef = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }, el: Element | null) => {
		const key = getEventKey(event)
		const previous = eventCardElements.get(key)

		if (!el) {
			if (previous) {
				eventResizeObserver.value?.unobserve(previous)
				eventCardElements.delete(key)
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete eventHeights[key]
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete eventWidths[key]
			}
			return
		}

		const node = el as HTMLElement
		if (previous && previous !== node) {
			eventResizeObserver.value?.unobserve(previous)
		}

		eventCardElements.set(key, node)
		elementToEventKey.set(node, key)
		eventResizeObserver.value?.observe(node)
	}

	const getMeasuredEventHeight = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => {
		return eventHeights[getEventKey(event)] ?? Infinity
	}

	const getMeasuredEventWidth = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => {
		return eventWidths[getEventKey(event)] ?? Infinity
	}

	const getEventVisualScale = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => {
		const width = getMeasuredEventWidth(event)
		const height = getMeasuredEventHeight(event)

		if (!Number.isFinite(width) || !Number.isFinite(height)) return 0.5

		const widthScale = clamp((width - 84) / 140, 0, 1)
		const heightScale = clamp((height - 24) / 76, 0, 1)
		return clamp((widthScale * 0.45) + (heightScale * 0.55), 0, 1)
	}

	type EventLayout = {
		showBadges: boolean
		showPeriod: boolean
		titleLines: number
		periodClass: string
		badgeSize: "xs" | "sm" | "md"
		fontScale: number
	}

	const getEventLayout = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }): EventLayout => {
		const width = getMeasuredEventWidth(event)
		const height = getMeasuredEventHeight(event)
		const ratio = clamp(getEventStepsRatio(event), 0.75, 8)
		const titleLength = (event.title || "").length
		const scale = getEventVisualScale(event)
		const titleDensity = clamp(titleLength / 28, 0.8, 2.8)

		// Taille typo période.
		const periodClass = scale < 0.35 ? "text-[10px] leading-none" : scale < 0.72 ? "text-[11px] leading-tight" : "text-xs leading-tight"

		// Taille badge dynamique via prop size, plus sensible aux contraintes réelles.
		let badgeSize: "xs" | "sm" | "md" = "md"
		if (width < 160 || height < 56 || scale < 0.62) {
			badgeSize = "xs"
		} else if (width < 220 || height < 74 || scale < 0.9) {
			badgeSize = "sm"
		}

		// Facteur de taille titre.
		const fontScale = clamp(ratio / titleDensity, 0.7, 2.2)

		// Base théorique de lignes titre.
		const baseLines = clamp((ratio * 1.35) / titleDensity, 1, 4)

		// Sans mesure réelle, fallback permissif.
		if (!Number.isFinite(width) || !Number.isFinite(height)) {
			return {
				showBadges: true,
				showPeriod: true,
				titleLines: Math.round(baseLines),
				periodClass,
				badgeSize,
				fontScale
			}
		}

		// Priorité: titre > période > badges.
		let showBadges = width > EVENT_NARROW_WIDTH
		let showPeriod = !(width <= EVENT_TINY_WIDTH || (width <= EVENT_NARROW_WIDTH && titleLength > 12))

		// Budget vertical estimé en px.
		const verticalPadding = 8 // py-1
		const rowGap = 2 // gap-0.5
		const titleLinePx = clamp(9.4 + (fontScale * 2.3), 10, 14.5)
		const periodRowPx = periodClass.includes("10px") ? 11 : periodClass.includes("11px") ? 12.5 : 14
		const badgeRowPx = badgeSize === "xs" ? 14 : badgeSize === "sm" ? 16 : 18
		const available = Math.max(12, height - verticalPadding)

		// Garde-fous explicites basés sur la hauteur réelle.
		const minHeightForPeriod = verticalPadding + titleLinePx + periodRowPx + rowGap
		const minHeightForBadges = verticalPadding + titleLinePx + badgeRowPx + rowGap
		if (height < minHeightForPeriod) showPeriod = false
		if (height < minHeightForBadges) showBadges = false

		const computeTitleLines = (period: boolean, badges: boolean) => {
			const extraRows = (period ? 1 : 0) + (badges ? 1 : 0)
			const gaps = extraRows > 0 ? extraRows : 0
			const extrasPx = (period ? periodRowPx : 0) + (badges ? badgeRowPx : 0) + (gaps * rowGap)
			return Math.floor((available - extrasPx) / titleLinePx)
		}

		let possibleLines = computeTitleLines(showPeriod, showBadges)
		if (possibleLines < 1 && showBadges) {
			showBadges = false
			possibleLines = computeTitleLines(showPeriod, showBadges)
		}
		if (possibleLines < 1 && showPeriod) {
			showPeriod = false
			possibleLines = computeTitleLines(showPeriod, showBadges)
		}

		// Règle permissive: on garde les badges tant qu'ils rentrent visuellement.
		if (showBadges) {
			const linesWithBadges = computeTitleLines(showPeriod, true)
			const linesWithoutBadges = computeTitleLines(showPeriod, false)
			const noRoomForAnyTitle = linesWithBadges < 1
			const tinyCardPenalty = width <= 140 && height <= 46 && linesWithoutBadges >= 1
			const heavyTradeoffOnVeryNarrow = width <= 120 && linesWithBadges < 1 && linesWithoutBadges >= 1

			if (noRoomForAnyTitle || tinyCardPenalty || heavyTradeoffOnVeryNarrow) {
				showBadges = false
				possibleLines = computeTitleLines(showPeriod, showBadges)
			}
		}

		const titleLines = clamp(Math.min(Math.round(baseLines), Math.max(1, possibleLines)), 1, 4)

		return {
			showBadges,
			showPeriod,
			titleLines,
			periodClass,
			badgeSize,
			fontScale
		}
	}

	const shouldShowBadges = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => getEventLayout(event).showBadges
	const shouldShowPeriod = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => getEventLayout(event).showPeriod
	const getPeriodTextClass = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => getEventLayout(event).periodClass
	const getBadgeSize = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }): "xs" | "sm" | "md" => getEventLayout(event).badgeSize

	const getEventDurationInMinutes = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => {
		const start = new Date(event.start).getTime()
		const end = new Date(event.end).getTime()

		if (Number.isNaN(start) || Number.isNaN(end)) return timeStep.value
		return Math.max(1, Math.round((end - start) / 60000))
	}

	const getEventStepsRatio = (event: { start: Date | string, end: Date | string, media?: { id?: number }, id?: number, title?: string }) => {
		return getEventDurationInMinutes(event) / Math.max(1, timeStep.value)
	}

	const getEventStyleVars = (event: { start: Date | string, end: Date | string, media?: { id?: number, title?: string, coverImage?: { color?: string } } }) => {
		const layout = getEventLayout(event)

		return {
			"--anime-theme-color": event.media?.coverImage?.color || "var(--ui-color-primary-400)",
			"--event-title-lines": String(layout.titleLines),
			"--event-font-scale": String(layout.fontScale)
		}
	}

	// Lifecycle hooks pour ResizeObserver
	onMounted(() => {
		if (typeof ResizeObserver === "undefined") return

		eventResizeObserver.value = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const key = elementToEventKey.get(entry.target)
				if (!key) continue
				eventHeights[key] = Math.round(entry.contentRect.height)
				eventWidths[key] = Math.round(entry.contentRect.width)
			}
		})

		for (const el of eventCardElements.values()) {
			eventResizeObserver.value.observe(el)
		}
	})

	onBeforeUnmount(() => {
		eventResizeObserver.value?.disconnect()
		eventResizeObserver.value = null
		eventCardElements.clear()
	})

	// Fonction pour générer une clé de cache basée sur la plage de dates
	const getCacheKey = (start: number, end: number): string => {
		return `${start}-${end}`
	}

	// Fonction pour fetcher toutes les pages avec pagination et cache
	const fetchAllAiringAnimes = async (start: number, end: number) => {
		const cacheKey = getCacheKey(start, end)

		// Vérifier si les données sont déjà en cache
		if (cache.has(cacheKey)) {
			return cache.get(cacheKey)
		}

		let allSchedules: unknown[] = []
		let page = 1
		let hasNextPage = true
		let retryCount = 0
		const maxRetries = 3

		while (hasNextPage && retryCount < maxRetries) {
			try {
				const { data } = await useAsyncGql({
					operation: "getAiringAnimes",
					variables: {
						page,
						airingAtGreater: start,
						airingAtLesser: end
					}
				})

				if (data.value?.Page?.airingSchedules) {
					allSchedules = [...allSchedules, ...(data.value.Page.airingSchedules as unknown[])]
					hasNextPage = (data.value.Page.pageInfo?.hasNextPage as boolean) ?? false
					page++
					retryCount = 0 // Reset retry count on success
				} else {
					hasNextPage = false
				}
			} catch (error) {
				console.error(`Erreur lors du fetch de la page ${page}:`, error)
				retryCount++
				if (retryCount >= maxRetries) {
					console.error("Nombre maximum de tentatives atteint, arrêt du fetch")
					hasNextPage = false
				}
				// Attendre un peu avant de réessayer
				await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
			}
		}

		const result = { Page: { airingSchedules: allSchedules } } as { Page: { airingSchedules: unknown[] } }

		// Stocker en cache
		cache.set(cacheKey, result)

		return result
	}

	// Fonction pour vider le cache (utile pour forcer un rafraîchissement)
	const clearCache = (): void => {
		cache.clear()
		console.log("🗑️ Cache vidé")
	}

	// Fonction pour vider une entrée spécifique du cache
	const clearCacheEntry = (start: number, end: number): void => {
		const cacheKey = getCacheKey(start, end)
		cache.delete(cacheKey)
		console.log(`🗑️ Entrée ${cacheKey} supprimée du cache`)
	}

	// Retourner les fonctions et l'état du cache
	return {
		// Fonctions existantes
		fetchAllAiringAnimes,
		clearCache,
		clearCacheEntry,
		cacheSize: cache.size,

		// État et fonctions du calendrier
		vueCalRef,
		timeStep,
		airingAtGreater,
		airingAtLesser,
		updateDateRange,
		handleWheel,
		onCalendarReady,
		refreshView,

		// Layout des événements
		setEventCardRef,
		shouldShowBadges,
		shouldShowPeriod,
		getPeriodTextClass,
		getBadgeSize,
		getEventStyleVars
	}
}

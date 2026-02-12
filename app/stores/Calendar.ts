import { defineStore } from "pinia"
import type { AnimeCalEvent } from "~/models/AnimeCalEvent"

export interface VueCalOptions {
	timeStep: number
	views: string[]
	timeAtCursor: boolean
	weekNumbers: boolean
	eventsOnMonthView: boolean
}

export const useCalendarStore = defineStore("Calendar", () => {
	// État des événements
	const events = ref<AnimeCalEvent[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)

	// Options vue-cal
	const vueCalOptions = reactive<VueCalOptions>({
		timeStep: 20,
		views: ["day", "week", "month", "year"],
		timeAtCursor: true,
		weekNumbers: true,
		eventsOnMonthView: true
	})

	// Plage de dates courante
	const currentDateRange = ref<{ start: number, end: number } | null>(null)

	// Actions pour les événements
	const setEvents = (newEvents: AnimeCalEvent[]) => {
		events.value = newEvents
	}

	const addEvents = (newEvents: AnimeCalEvent[]) => {
		// Éviter les doublons basés sur l'ID de l'épisode
		const existingIds = new Set(events.value.map(e => e.id))
		const uniqueNewEvents = newEvents.filter(e => e.id && !existingIds.has(e.id))
		events.value = [...events.value, ...uniqueNewEvents]
	}

	const clearEvents = () => {
		events.value = []
	}

	// Mettre à jour les événements : ajouter, supprimer et déplacer selon les nouvelles données
	const updateEvents = (newEvents: AnimeCalEvent[]) => {
		const newEventIds = new Set(newEvents.map(e => e.id).filter(Boolean))

		// Supprimer les événements qui n'existent plus dans les nouvelles données
		events.value = events.value.filter((event) => {
			if (!event.id) return true // Garder les événements sans ID
			return newEventIds.has(event.id)
		})

		// Ajouter ou mettre à jour les événements
		newEvents.forEach((newEvent) => {
			if (!newEvent.id) return

			const existingIndex = events.value.findIndex(e => e.id === newEvent.id)

			if (existingIndex >= 0) {
				// Mettre à jour l'événement existant (déplacement, changement d'heure, etc.)
				events.value[existingIndex] = newEvent
			} else {
				// Ajouter le nouvel événement
				events.value.push(newEvent)
			}
		})
	}

	// Actions pour les options vue-cal
	const updateTimeStep = (newStep: number) => {
		vueCalOptions.timeStep = Math.max(5, Math.min(120, newStep))
	}

	const updateVueCalOptions = (options: Partial<VueCalOptions>) => {
		Object.assign(vueCalOptions, options)
	}

	// Actions pour la plage de dates
	const setCurrentDateRange = (start: number, end: number) => {
		currentDateRange.value = { start, end }
	}

	const clearCurrentDateRange = () => {
		currentDateRange.value = null
	}

	// Getters
	const isLoading = computed(() => loading.value)
	const hasError = computed(() => !!error.value)

	return {
		// État
		events,
		loading,
		error,
		vueCalOptions,
		currentDateRange,

		// Getters
		isLoading,
		hasError,

		// Actions
		setEvents,
		addEvents,
		updateEvents,
		clearEvents,
		updateTimeStep,
		updateVueCalOptions,
		setCurrentDateRange,
		clearCurrentDateRange
	}
}, {
	// Désactiver complètement la persistance pour éviter les problèmes de sérialisation
	persist: false
})

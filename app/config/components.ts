import { defineAsyncComponent } from "vue"

// Définition centrale des composants
const COMPONENTS = [
	{ id: 1, name: "MetricsCard" },
	{ id: 2, name: "ActivityOverviewCard" },
	{ id: 3, name: "HighlightCard" },
	{ id: 4, name: "ListCard" },
	{ id: 5, name: "MeanScoreBarCard" },
	{ id: 6, name: "StatusDonutCard" },
	{ id: 7, name: "WatchTimeCard" },
	{ id: 8, name: "AnimesWatchedCard" },
	{ id: 9, name: "EpisodesWatchedCard" }
] as const

type ComponentName = typeof COMPONENTS[number]["name"]

// Génération des types et constantes
export const ComponentType = Object.fromEntries(
	COMPONENTS.map(({ id, name }) => [name, id])
) as Record<ComponentName, number>

// Mappages
export const componentIdToName = Object.fromEntries(
	COMPONENTS.map(({ id, name }) => [id, name])
) as Record<number, string>

export const componentNameToId = Object.fromEntries(
	COMPONENTS.map(({ id, name }) => [name, id])
) as Record<string, number>

// Fonctions utilitaires
export const getComponentNameById = (id: number): string | undefined =>
	componentIdToName[id]

export const getComponentIdByName = (name: string): number | undefined =>
	componentNameToId[name]

export const getComponentNames = (): string[] =>
	COMPONENTS.map(c => c.name)

export const getComponentIds = (): number[] =>
	COMPONENTS.map(c => c.id)

// Composants dynamiques
export const dynamicComponents = Object.fromEntries(
	COMPONENTS.map(({ id, name }) => [
		id,
		defineAsyncComponent(() => import(`~/components/cards/${name}.vue`))
	])
) as Record<number, ReturnType<typeof defineAsyncComponent>>

export const getComponentById = (id: number) =>
	dynamicComponents[id] || null

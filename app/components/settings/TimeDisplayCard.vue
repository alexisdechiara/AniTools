<script setup lang="ts">
import { clockTimeOptions } from "~/utils/format"
import { listTimeZones, type HourCycleChoice } from "~/utils/time-display"

type ZoneOption = "auto" | "browser" | "custom"

/** Friday 13 November 2026, 12:30 UTC: a fixed instant, so the preview never drifts. */
const PREVIEW_INSTANT = new Date(Date.UTC(2026, 10, 13, 12, 30))

const preferences = usePreferencesStore()
const userStore = useUserStore()
const { display, activeDisplay, ready, browserTimeZone, formatDateTime } = useTimeDisplay()

const profileZone = computed(() => userStore.options.timezone?.trim() || null)
const profileUnusable = computed(() =>
	userStore.isOAuthAuthenticated && !display.value.profileZoneUsable
)
const profileDescription = computed(() => {
	if (display.value.profileZoneUsable && profileZone.value) return profileZone.value
	if (!userStore.isOAuthAuthenticated) return "Available after you sign in with AniList."
	return profileZone.value
		? `Your profile's zone (${profileZone.value}) can't be used here.`
		: "Your AniList profile has no time zone yet."
})

const zoneItems = computed(() => [
	{
		label: "My AniList profile",
		description: profileDescription.value,
		value: "auto" as const,
		disabled: !display.value.profileZoneUsable
	},
	{
		label: "This browser",
		description: browserTimeZone.value ?? "Unknown; times use UTC.",
		value: "browser" as const
	},
	{
		label: "Another time zone",
		value: "custom" as const
	}
])

const clockItems: Array<{ label: string, value: HourCycleChoice }> = [
	{ label: "Automatic", value: "auto" },
	{ label: "24-hour", value: "h23" },
	{ label: "12-hour", value: "h12" }
]

// The zone last picked in the list, so going back to "Another time zone" restores it.
const rememberedZone = ref<string | null>(null)

const customZone = computed<string>({
	get: () => display.value.source === "chosen"
		? display.value.timeZone
		: rememberedZone.value ?? display.value.timeZone,
	set: (zone) => {
		rememberedZone.value = zone
		preferences.setTimeZoneChoice(zone)
	}
})

/**
 * What is in effect, not only what is stored: "auto" with an unusable profile zone, or a
 * stored zone this browser cannot use, reads as "This browser".
 */
const zoneOption = computed<ZoneOption>({
	get: () => {
		if (preferences.timeZoneChoice === "browser") return "browser"
		if (display.value.source === "chosen") return "custom"
		return display.value.profileZoneUsable ? "auto" : "browser"
	},
	set: (option) => {
		if (option === "custom") {
			// Starts from the zone in effect, so the printed times do not jump.
			preferences.setTimeZoneChoice(customZone.value)
			return
		}
		if (display.value.source === "chosen") rememberedZone.value = display.value.timeZone
		preferences.setTimeZoneChoice(option)
	}
})

const hourCycle = computed<HourCycleChoice>({
	get: () => preferences.hourCycle === "h23" || preferences.hourCycle === "h12"
		? preferences.hourCycle
		: "auto",
	set: choice => preferences.setHourCycle(choice)
})

const zones = computed(() => ready.value
	? listTimeZones([display.value.timeZone, browserTimeZone.value, rememberedZone.value])
	: []
)

const preview = computed(() => formatDateTime(PREVIEW_INSTANT, {
	weekday: "short",
	...clockTimeOptions(activeDisplay.value)
}))

const gridNote = computed(() =>
	ready.value && !!browserTimeZone.value && display.value.timeZone !== browserTimeZone.value
)
</script>

<template>
	<UPageCard
		title="Time display"
		description="How airing times and dates read across AniTools. Saved only in this browser."
		:ui="{ container: 'gap-y-4' }">
		<!-- The zone names, the stored choices and the preview all come from the browser. -->
		<div v-if="ready" class="flex flex-col gap-4">
			<URadioGroup
				v-model="zoneOption"
				:items="zoneItems"
				legend="Time zone"
				variant="card"
				:ui="{ fieldset: 'grid gap-2' }" />

			<USelectMenu
				v-if="zoneOption === 'custom'"
				v-model="customZone"
				:items="zones"
				virtualize
				icon="i-lucide-globe"
				aria-label="Time zone"
				:search-input="{ placeholder: 'Search a time zone' }"
				class="w-full sm:w-72" />

			<UAlert
				v-if="profileUnusable"
				icon="i-lucide-triangle-alert"
				color="warning"
				variant="soft"
				description="Times use this browser's zone until your AniList profile has a named time zone." />

			<URadioGroup
				v-model="hourCycle"
				:items="clockItems"
				legend="Clock"
				variant="card"
				:ui="{ fieldset: 'grid gap-2 sm:grid-cols-3' }" />

			<p class="flex items-center gap-2.5 rounded-lg bg-elevated/50 p-3" aria-live="polite">
				<UIcon name="i-lucide-clock" class="size-4.5 shrink-0 text-primary" aria-hidden="true" />
				<span class="grow text-xs text-muted">An episode airing Friday at 12:30 UTC reads</span>
				<strong class="shrink-0 font-semibold text-highlighted" data-time-display-preview>{{ preview }}</strong>
			</p>

			<p v-if="gridNote" class="flex items-start gap-2 text-xs text-muted">
				<UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				The calendar grid stays laid out in this browser's zone. Only the printed times follow this setting.
			</p>
		</div>
		<div v-else class="flex flex-col gap-2" aria-hidden="true">
			<USkeleton v-for="index in 4" :key="index" class="h-12 w-full" />
		</div>
	</UPageCard>
</template>

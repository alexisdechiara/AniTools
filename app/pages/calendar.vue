<template>
	<UDashboardPanel id="calendar" class="h-screen">
		<vue-cal ref="vueCalRef" :time-step="timeStep" time-at-cursor week-numbers :views="['day', 'week', 'month', 'year']"
			:events="calendarEvents" @wheel="handleWheel" @ready="onCalendarReady" @view-change="handleViewChange"
			events-on-month-view>

			<template #header="{ view, availableViews }">
				<div class="flex items-center bg-default px-8 h-16">
					<div class="flex items-center gap-2 mr-auto">
						<h2 class="text-2xl font-light text-dimmed mr-6">
							<strong class="font-bold capitalize text-default">
								{{ new Date(view.now).format('MMMM') }}
							</strong>
							{{ new Date(view.now).format('YYYY') }}
							<span class="text-primary text-xs ms-2 inline-flex items-center align-middle -tracking-widest">
								w
								{{ new Date(view.now).getWeek() }}
							</span>
						</h2>
						<UButton label="Today" size="xs" color="neutral" variant="soft" @click="view.switch(view.id, new Date())" />
						<div class="flex items-center gap-2">
							<UButton icon="i-lucide-chevron-left" size="xs" variant="ghost" color="neutral"
								@click="view.previous()" />
							<UButton icon="i-lucide-chevron-right" size="xs" variant="ghost" color="neutral" @click="view.next()" />
						</div>
					</div>
					<UTabs v-model="view.id" size="xs" class="w-fit" color="neutral"
						:items="Object.keys(availableViews).map((viewKey: string) => ({ label: viewKey, value: viewKey }))" />
				</div>
			</template>
			<template #weekday-heading="{ label, date, view }">
				<UButton size="sm" color="neutral" variant="soft" class="rounded-full uppercase m-2 cursor-pointer"
					@click="view.switch('day', new Date(view.now))">{{ label }}
					<strong class="font-bold">{{ date.format('DD') }}</strong>
				</UButton>
			</template>
			<template #event="{ event }">
				<AnimeDetailsPopover :data="event" :content="{ sideOffset: 32 }">
					<div
						class="calendar-event-card flex flex-col gap-0.5 size-full py-1 px-1.5 bg-(--anime-theme-color)/25 border-l-4 border-(--anime-theme-color) rounded-lg cursor-pointer hover:bg-(--anime-theme-color)/50 transition-colors"
						:ref="(el) => setEventCardRef(event, el as Element)" :style="getEventStyleVars(event)">
						<span class="font-medium text-default calendar-event-title">{{ event.title }}</span>
						<span v-if="shouldShowPeriod(event)" class="text-muted font-light" :class="getPeriodTextClass(event)">{{
							event.start.format('HH:mm') }} - {{ event.end.format('HH:mm')
							}}</span>
						<div v-if="shouldShowBadges(event)" class="flex items-center gap-2 justify-between">
							<UBadge v-if="event.media?.format" :label="event.media?.format" :size="getBadgeSize(event)"
								variant="subtle"
								class="ring-(--anime-theme-color)/25 bg-(--anime-theme-color)/25 text-(--anime-theme-color)"
								:style="{ '--anime-theme-color': event.media?.coverImage?.color || 'var(--ui-color-primary-500)' }" />
							<Icon :name="`i-circle-flags-${event.media?.countryOfOrigin || 'jp'}`" class="size-3" />
						</div>
					</div>
				</AnimeDetailsPopover>
			</template>

		</vue-cal>
	</UDashboardPanel>
</template>

<script lang="ts" setup>
// @ts-ignore
import { VueCal, addDatePrototypes } from 'vue-cal'
import 'vue-cal/style'
import { AnimeCalEvent } from '~/models/AnimeCalEvent'
import { getCalendarRange } from '~/utils/calendarRange'
import { useAiringSchedules } from '~/composables/useAiringSchedules'

addDatePrototypes()
const calendarRange = getCalendarRange()

// Utiliser le composable pour tout
const {
	vueCalRef,
	timeStep,
	airingAtGreater,
	airingAtLesser,
	updateDateRange,
	handleWheel,
	onCalendarReady,
	onViewChange,
	fetchAllAiringAnimes,
	setEventCardRef,
	shouldShowBadges,
	shouldShowPeriod,
	getPeriodTextClass,
	getBadgeSize,
	getEventStyleVars
} = useAiringSchedules()

// Initialiser la plage de dates
updateDateRange(calendarRange.start, calendarRange.end)

// État réactif pour les données et le chargement
const { data, pending, refresh } = await useAsyncData('calendar-animes', async () => {
	const schedules = await fetchAllAiringAnimes(airingAtGreater.value!, airingAtLesser.value!)
	return schedules
})

const calendarEvents = computed(() => {
	// Utiliser directement les données de useAsyncData
	if ((data.value as any)?.Page?.airingSchedules) {
		return (data.value as any).Page.airingSchedules.map((item: any) => new AnimeCalEvent(item))
	}
	return []
})

// Wrapper pour onViewChange avec le callback refresh
const handleViewChange = (view: any) => {
	onViewChange(view, refresh)
}

</script>

<style>
.vuecal.vuecal--default-theme {
	--vuecal-primary-color: transparent !important;
	--vuecal-event-border-color: transparent !important;
	--vuecal-height: 100vh !important;
	--vuecal-weekday-bar-height: 3rem !important;
	--vuecal-schedules-bar-height: 0rem !important;
	--vuecal-min-cell-width: 1rem !important;

	--vuecal-border-color: var(--ui-border);
	--vuecal-header-color: transparent;
	--vuecal-event-color: transparent;
	--vuecal-event-border-color: none;
	--vuecal-base-color: var(--text-color-default);

	.vuecal__weekdays-headings {
		background-color: var(--ui-bg-muted) !important;
	}

	.vuecal__weekday {
		background-color: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.vuecal__time-column {
		border-right: none;
		background-color: transparent;
	}

	.vuecal__time-cell {
		color: var(--text-color-highlighted);
	}

	.vuecal__cell {
		box-shadow: none;
		border-right: 1px solid var(--vuecal-border-color);
	}

	.vuecal__cell:last-child {
		border-right: none;
	}

	.vuecal__event {
		min-height: 2rem;
	}

	.vuecal__event-details {
		padding: 0 !important;
		background-color: var(--ui-bg) !important;
		border-radius: var(--radius-lg) !important;
		width: 100% !important;
		height: 100% !important;
		margin: 0 0.125rem !important;
	}

	.vuecal__scrollable-wrap {
		background-color: var(--color-neutral-50);
		border-top-left-radius: var(--radius-lg);
		border-left: 1px solid var(--border-color-muted);
		border-top: 1px solid var(--border-color-muted);
		overflow: hidden !important;
	}

	.vuecal__scrollable {
		overflow-x: hidden !important;
		overflow-y: auto !important;
	}

	.vuecal__body {
		background-color: var(--ui-bg);
		border-top-left-radius: var(--radius-2xl);
	}
}

.calendar-event-title {
	--event-width-font-bonus: 0;
	--event-title-line-height: 1.18;
	--event-title-min-size: 0.625rem;
	--event-title-max-size: 1rem;

	display: block;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	line-clamp: var(--event-title-lines, 2);
	-webkit-line-clamp: var(--event-title-lines, 2);
	overflow: ellipsis;
	font-size: clamp(var(--event-title-min-size),
			calc(0.58rem + (var(--event-font-scale, 1) * 0.12rem) + (var(--event-width-font-bonus) * 1rem)),
			var(--event-title-max-size));
	line-height: var(--event-title-line-height);
	overflow: clip;
	white-space: normal;
	word-break: break-word;
	overflow-wrap: anywhere;
}

.calendar-event-card {
	container-type: inline-size;
	container-name: event-card;
}

@container event-card (max-width: 90px) {
	.calendar-event-title {
		--event-width-font-bonus: -0.06;
	}
}

@container event-card (min-width: 91px) and (max-width: 130px) {
	.calendar-event-title {
		--event-width-font-bonus: -0.02;
	}
}

@container event-card (min-width: 170px) {
	.calendar-event-title {
		--event-width-font-bonus: 0.03;
	}
}
</style>

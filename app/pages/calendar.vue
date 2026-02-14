<template>
	<UDashboardPanel id="calendar" class="h-screen">
		<vue-cal ref="vueCalRef" v-model:view="currentView" :time-step="timeStep" time-at-cursor week-numbers
			:views="['day', 'week', 'month']" :events="filteredCalendarEvents" @wheel="handleWheel"
			:time-cell-height="currentView === 'day' ? 96 : currentView === 'week' ? 64 : 48" @ready="onCalendarReady"
			@view-change="onViewChange">
			<template #header="{ view, availableViews }">
				<div class="flex items-center bg-default px-6 h-16">
					<div class="flex items-center gap-2 mr-auto">
						<h2 class="text-2xl font-light inline-flex text-dimmed me-4 gap-2">
							<strong class="font-bold capitalize text-default">
								{{ view.now.format('MMMM') }}
							</strong>
							{{ view.now.format('YYYY') }}
							<span class="text-primary text-sm ms-2 flex items-center -tracking-widest ">
								{{ isWeekView ? `W ${view.now.getWeek()}` : isDayView ? view.now.format(`DD{S}`) : '' }}
							</span>
						</h2>
						<UButton label="Today" size="xs" color="neutral" variant="soft" @click="view.goToToday()"
							class="cursor-pointer" />
						<div class="flex items-center gap-2">
							<UButton icon="i-lucide-chevron-left" size="xs" variant="ghost" color="neutral" class="cursor-pointer"
								@click="view.previous()" />
							<UButton icon="i-lucide-chevron-right" size="xs" variant="ghost" color="neutral" class="cursor-pointer"
								@click="view.next()" />
						</div>
					</div>
					<div class="flex gap-2 items-center">
						<UDropdownMenu :items="items" size="sm" :ui="{ item: 'cursor-pointer' }">
							<UButton icon="i-lucide-list-filter" size="sm" color="neutral" variant="soft"
								class="h-fit cursor-pointer" />
						</UDropdownMenu>
						<UTabs v-model="currentView" size="xs" class="w-fit" color="neutral"
							:ui="{ root: 'gap-0', trigger: 'cursor-pointer' }"
							:items="Object.keys(availableViews).map((viewKey: string) => ({ label: String(viewKey).charAt(0).toUpperCase() + String(viewKey).slice(1), value: viewKey }))" />
					</div>
				</div>
			</template>
			<template #weekday-heading="{ label, date }">
				<UButton size="sm" color="neutral" variant="soft" class="rounded-full uppercase m-2"
					:class="!isMonthView && 'cursor-pointer'"
					@click="!isMonthView ? $refs.vueCalRef?.view.switch('day', date) : ''">
					{{ date.format("dddd") }}
					<strong v-if="!isMonthView" class="font-bold">{{ date.format('DD') }}</strong>
				</UButton>
			</template>
			<template #event="{ event }">
				<AnimeDetailsPopover :data="event" :content="{ sideOffset: 32 }">
					<div
						class="calendar-event-card flex flex-col gap-0.5 size-full justify-center py-1 px-1.5 bg-(--anime-theme-color)/25 border-l-4 border-(--anime-theme-color) rounded-lg cursor-pointer hover:bg-(--anime-theme-color)/50 transition-colors"
						:ref="(el) => setEventCardRef(event, el as Element)" :style="getEventStyleVars(event)">
						<span class="font-medium text-default calendar-event-title">{{ event.title }}</span>
						<span v-if="shouldShowPeriod(event)" class="text-muted font-light" :class="getPeriodTextClass(event)">{{
							event.start.format('HH:mm') }} - {{ event.end.format('HH:mm')
							}}</span>
						<div v-if="shouldShowBadges(event)" class="flex items-center gap-2">

							<template v-if="event.streaming">
								<UBadge v-for="platform in event.streaming" :key="platform" :label="platform"
									:size="getBadgeSize(event)" variant="subtle"
									class="ring-(--anime-theme-color)/25 bg-(--anime-theme-color)/25 text-(--anime-theme-color)"
									:style="{ '--anime-theme-color': event.media?.coverImage?.color || 'var(--ui-color-primary-500)' }" />
							</template>
							<UBadge v-else-if="event.media?.format" :label="event.media?.format" :size="getBadgeSize(event)"
								variant="subtle"
								class="ring-(--anime-theme-color)/25 bg-(--anime-theme-color)/25 text-(--anime-theme-color)"
								:style="{ '--anime-theme-color': event.media?.coverImage?.color || 'var(--ui-color-primary-500)' }" />
							<template v-if="event.languages">
								<Icon v-for="language in event.languages" :key="language" :name="`i-circle-flags-${language}`"
									class="size-3" />
							</template>
						</div>
					</div>
				</AnimeDetailsPopover>
			</template>
			<template v-if="isMonthView" #cell="{ cell }">
				<div class="relative flex flex-col items-end size-full cursor-pointer hover:bg-muted p-2"
					@click="$refs.vueCalRef?.view.switch('week', cell.start)">
					<UBadge variant="soft" color="neutral" class="rounded-full size-fit">
						{{ cell.start.format("DD") }}
					</UBadge>
				</div>
			</template>
		</vue-cal>
	</UDashboardPanel>
</template>

<script lang="ts" setup>
// @ts-ignore
import { VueCal, addDatePrototypes } from 'vue-cal'
import 'vue-cal/style'
import { AnimeCalEvent, SimuldubCalEvent } from '~/models/AnimeCalEvent'
import { getCalendarRange } from '~/utils/calendarRange'
import { useAiringSchedules } from '~/composables/useAiringSchedules'
import type { DropdownMenuItem } from '@nuxt/ui'

addDatePrototypes()
const calendarRange = getCalendarRange()

const {
	timeStep,
	airingAtGreater,
	airingAtLesser,
	updateDateRange,
	handleWheel,
	onCalendarReady,
	refreshView,
	fetchAllAiringAnimes,
	setEventCardRef,
	shouldShowBadges,
	shouldShowPeriod,
	getPeriodTextClass,
	getBadgeSize,
	getEventStyleVars,
	vueCalRef
} = useAiringSchedules()

const { fetchSimuldubByDateRange } = useSimuldub()

const currentView = ref('week')
const currentFormat = ref<string[]>(['TV', 'ONA', 'MOVIE'])
const dubbing = ref<string[]>(['jp', 'cn', 'en', 'fr'])

const items = computed(() => {
	let array = [{
	label: 'Formats',
	type: 'label' as const
}, {
	type: 'separator' as const
}, {
	label: 'TV',
	type: 'checkbox' as const,
	checked: currentFormat.value.includes('TV'),
	onUpdateChecked(checked: boolean) {
		checked ? currentFormat.value.push('TV') : currentFormat.value = currentFormat.value.filter((format: string) => format !== 'TV')
	},
	onSelect(e: Event) {
		e.preventDefault()
	}
}, {
	label: 'ONA',
	type: 'checkbox' as const,
	checked: currentFormat.value.includes('ONA'),
	onUpdateChecked(checked: boolean) {
		checked ? currentFormat.value.push('ONA') : currentFormat.value = currentFormat.value.filter((format: string) => format !== 'ONA')
		},
		onSelect(e: Event) {
			e.preventDefault()
	}
}, {
	label: 'Movie',
	type: 'checkbox' as const,
	checked: currentFormat.value.includes('MOVIE'),
	onUpdateChecked(checked: boolean) {
		checked ? currentFormat.value.push('MOVIE') : currentFormat.value = currentFormat.value.filter((format: string) => format !== 'MOVIE')
	},
		onSelect(e: Event) {
			e.preventDefault()
		}
}, {
	label: 'TV Short',
	type: 'checkbox' as const,
	checked: currentFormat.value.includes('TV_SHORT'),
	onUpdateChecked(checked: boolean) {
		checked ? currentFormat.value.push('TV_SHORT') : currentFormat.value = currentFormat.value.filter((format: string) => format !== 'TV_SHORT')
	},
		onSelect(e: Event) {
			e.preventDefault()
		}
}, {
	label: 'OVA',
	type: 'checkbox' as const,
	checked: currentFormat.value.includes('OVA'),
	onUpdateChecked(checked: boolean) {
		checked ? currentFormat.value.push('OVA') : currentFormat.value = currentFormat.value.filter((format: string) => format !== 'OVA')
	},
		onSelect(e: Event) {
			e.preventDefault()
		}
}, {
	label: 'Specials',
	type: 'checkbox' as const,
	checked: currentFormat.value.includes('SPECIAL'),
	onUpdateChecked(checked: boolean) {
		checked ? currentFormat.value.push('SPECIAL') : currentFormat.value = currentFormat.value.filter((format: string) => format !== 'SPECIAL')
	},
		onSelect(e: Event) {
			e.preventDefault()
		}
}, {
	label: 'Dubbing',
	type: 'label' as const
}, {
	type: 'separator' as const
}, {
			label: 'Japanese',
			type: 'checkbox' as const,
			disabled: !calendarEvents.value.some((event: any) => event.languages.includes('jp')),
			checked: dubbing.value.includes('jp'),
			onUpdateChecked(checked: boolean) {
				checked ? dubbing.value.push('jp') : dubbing.value = dubbing.value.filter((format: string) => format !== 'jp')
			},
			onSelect(e: Event) {
				e.preventDefault()
			}
		}, {
			label: 'Chinese',
			type: 'checkbox' as const,
			disabled: !calendarEvents.value.some((event: any) => event.languages.includes('cn')),
			checked: dubbing.value.includes('cn'),
			onUpdateChecked(checked: boolean) {
				checked ? dubbing.value.push('cn') : dubbing.value = dubbing.value.filter((format: string) => format !== 'cn')
			},
			onSelect(e: Event) {
				e.preventDefault()
			}
		}] satisfies DropdownMenuItem[]

	if (calendarEvents.value.some((event: any) => event.languages.includes('en'))) {
		array.push({
			label: 'English',
			type: 'checkbox' as const,
			disabled: !calendarEvents.value.some((event: any) => event.languages.includes('en')),
			checked: dubbing.value.includes('en'),
			onUpdateChecked(checked: boolean) {
				checked ? dubbing.value.push('en') : dubbing.value = dubbing.value.filter((format: string) => format !== 'en')
			},
			onSelect(e: Event) {
				e.preventDefault()
			}
		})
	}

	if (calendarEvents.value.some((event: any) => event.languages.includes('fr'))) {
		array.push({
	label: 'French',
	type: 'checkbox' as const,
			disabled: !calendarEvents.value.some((event: any) => event.languages.includes('fr')),
			checked: dubbing.value.includes('fr'),
	onUpdateChecked(checked: boolean) {
		checked ? dubbing.value.push('fr') : dubbing.value = dubbing.value.filter((format: string) => format !== 'fr')
	},
			onSelect(e: Event) {
				e.preventDefault()
			}
		})
	}

	return array
})

const isMonthView = computed(() => currentView.value === 'month')
const isDayView = computed(() => currentView.value === 'day')
const isWeekView = computed(() => currentView.value === 'week')

updateDateRange(calendarRange.start, calendarRange.end)

const { data, refresh } = await useAsyncData('calendar-animes', async () => {
	const schedules = await fetchAllAiringAnimes(airingAtGreater.value!, airingAtLesser.value!)
	return (schedules as any)?.Page?.airingSchedules
})

const { data: simuldubs, refresh: refreshSimuldubs } = await fetchSimuldubByDateRange({ start: new Date(calendarRange.start * 1000), end: new Date(calendarRange.end * 1000) })

const calendarEvents = ref<Array<AnimeCalEvent>>([])
watch(() => [data.value, simuldubs.value], () => {
	if (data.value) {
		const events = data.value.map((item: any) => new AnimeCalEvent(item))

		if (simuldubs.value?.length) {
			simuldubs.value.forEach((simuldub: any) => {
				const matchingCalEvent = events.find((event: AnimeCalEvent) => event.media.id === simuldub.anilist_media_id)
				if (matchingCalEvent) {
					if (matchingCalEvent.start === new Date(simuldub.start_date)) {
						matchingCalEvent.languages = simuldub.languages
					} else {
						const simuldubEvent = new SimuldubCalEvent({
							...{ media: matchingCalEvent.media },
							...simuldub,
						})
						events.push(simuldubEvent)
					}
				}
			})
		}

		// TODO: faire en sorte que l'on ne perde pas les données mais qu'ils n'y ai pas non plus de doublons
		calendarEvents.value = events
	}
}, {
	immediate: true,
	deep: true
})

const filteredCalendarEvents = computed(() =>
	calendarEvents.value.filter((event: any) => {
		const formatMatch = currentFormat.value.includes(event.media?.format)
		const languageMatch = event.languages.some((language: string) => dubbing.value.includes(language))

		return formatMatch && languageMatch
	})
)

const onViewChange = async (view: any) => {
	refreshView(view)
	nextTick(async () => {
		await refresh()
		await refreshSimuldubs()
	})
	setTimeout(() => {
		vueCalRef.value?.view.scrollToCurrentTime()
	}, 500)
}

onMounted(() => {
	vueCalRef.value?.view.scrollToCurrentTime()
})

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
		position: relative;
		box-shadow: none;
		border-right: 1px solid var(--vuecal-border-color);
		border-bottom: 1px solid var(--vuecal-border-color);
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
		background-color: var(--ui-bg-muted);
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
		position: relative;
		background-color: var(--ui-bg);
		border-top-left-radius: var(--radius-2xl);
	}
}

.vuecal__cell--today {
	background-color: color-mix(in srgb, var(--ui-bg-muted) 25%, transparent) !important;
}

.vuecal__week-number {
	width: 3rem !important;

	small {
		color: var(--text-color-muted) !important;
		background-color: transparent !important;

		&:before {
			content: "W";
		}
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

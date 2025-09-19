<script setup lang="ts">
import { sub } from "date-fns"
import type { DropdownMenuItem } from "@nuxt/ui"
import type { Period, Range } from "~/types"

const { isNotificationsSlideoverOpen } = useDashboard()

const items = [[{
	label: "New mail",
	icon: "i-lucide-send",
	to: "/inbox"
}, {
	label: "New customer",
	icon: "i-lucide-user-plus",
	to: "/customers"
}]] satisfies DropdownMenuItem[][]

const range = shallowRef<Range>({
	start: sub(new Date(), { days: 14 }),
	end: new Date()
})
const period = ref<Period>("daily")
</script>

<template>
	<UDashboardPanel id="home">
		<template #header>
			<div class="flex flex-col px-4 sm:px-6 pt-4 sm:pt-6">
				<span class="font-semibold text-highlighted text-4xl">Hey alexisdechiara 👋</span>
				<span class="text-dimmed font-light text-2xl">Here all your summary</span>
			</div>
		</template>

		<template #body>
			<!-- <HomeStats :period="period" :range="range" />
			<HomeChart :period="period" :range="range" />
			<HomeSales :period="period" :range="range" /> -->
		</template>
	</UDashboardPanel>
</template>

<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import SettingsAccountCard from "~/components/settings/AccountCard.vue"
import SettingsAppearanceCard from "~/components/settings/AppearanceCard.vue"
import SettingsScoreFormatCard from "~/components/settings/ScoreFormatCard.vue"
import SettingsTimeDisplayCard from "~/components/settings/TimeDisplayCard.vue"
import SettingsLocalDataCard from "~/components/settings/LocalDataCard.vue"

definePageMeta({
	feature: "settings",
	auth: FEATURE_REGISTRY.settings.access,
	indexable: FEATURE_REGISTRY.settings.indexable
})

useSeoMeta({
	title: "Settings",
	description: "Local display preferences for AniTools.",
	robots: "noindex, nofollow"
})
</script>

<template>
	<UDashboardPanel id="settings">
		<template #body>
			<div class="mx-auto w-full max-w-3xl space-y-6 pb-8 sm:pb-12">
				<header>
					<p class="text-xs font-semibold tracking-[0.02em] text-primary uppercase">
						Preferences
					</p>
					<h1 class="mt-0.5 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
						Settings
					</h1>
					<p class="mt-1.5 max-w-[46ch] text-sm text-muted">
						How AniTools looks and reads on this device. Nothing here changes your AniList account.
					</p>
				</header>

				<SettingsAccountCard />
				<SettingsAppearanceCard />
				<SettingsScoreFormatCard />
				<SettingsTimeDisplayCard />
				<SettingsLocalDataCard />
			</div>
		</template>
	</UDashboardPanel>
</template>

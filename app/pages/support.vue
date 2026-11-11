<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "support",
	auth: FEATURE_REGISTRY.support.access,
	indexable: FEATURE_REGISTRY.support.indexable
})

useSeoMeta({
	title: "Support",
	description: "Frequently asked questions about AniTools: accounts, local data, and how each tool works."
})

interface FaqEntry {
	question: string
	answer: string
}

const faq: FaqEntry[] = [
	{
		question: "Do I need to create an account?",
		answer: "No. AniTools never creates accounts of its own. Calendar, Tier list and Create work without signing in. Dashboard, Statistics, Rewind, Explore, Podium and Timeline need your anime list, so they ask you to either sign in with AniList or enter a public AniList username."
	},
	{
		question: "Where is my data stored?",
		answer: "Your anime list and profile are fetched live from AniList and never stored on our servers. What does stay on your device, in this browser's local storage, is: your display preferences (Settings), the last profile you viewed, and anything you build in Tier list or Create. Clearing your browser data removes all of it."
	},
	{
		question: "What's the difference between signing in and using a public username?",
		answer: "Signing in with AniList uses OAuth and lets AniTools read your list on your behalf, including private data like your own scores. Entering a public username instead reads whatever that AniList profile has made public, with no login required — handy for looking at your own list without going through OAuth, or checking a friend's."
	},
	{
		question: "What can a public profile do, and what can't it?",
		answer: "A public profile opens Dashboard, Statistics, Rewind, Explore, Podium and Timeline with whatever that AniList account shows publicly. It is read-only: it cannot see private entries and cannot add a title to Planning from Explore, which needs an AniList sign-in."
	},
	{
		question: "How does Rewind estimate watch time, and why can a recap be partial?",
		answer: "AniList does not record when each episode was watched. Rewind rebuilds the year from your list activity, your progress and the average episode length of each anime, so the total is an estimate. For a very active year only the most recent part of the activity history is loaded, and Rewind says so when a recap is partial."
	},
	{
		question: "Does changing the score format change my AniList scores?",
		answer: "No. The score format in Settings only changes how scores are displayed in this browser. Your scores and the format chosen on your AniList account stay exactly as they are."
	},
	{
		question: "Where are my tier lists and other local data kept?",
		answer: "In this browser's local storage, on this device only: tier lists, the Dashboard card layout, Explore picks and display preferences. They are not synced between devices. Export a tier list as JSON to keep a copy or move it to another browser."
	},
	{
		question: "How does the Calendar merge simuldub information?",
		answer: "The Calendar combines AniList's official airing schedule with simulcast dub data from AniTools' own catalogue, matched by anime. If that catalogue is temporarily unavailable, the Calendar still shows AniList's airing schedule on its own."
	},
	{
		question: "Why do some pages say \"beta\"?",
		answer: "AniTools ships features once they're usable, then keeps refining them. A beta label just means a feature is fully functional but may still change shape based on feedback."
	},
	{
		question: "I found a bug or have an idea — where do I report it?",
		answer: "Open an issue on the GitHub repository linked below. Screenshots and the anime list involved (if relevant) help a lot."
	}
]
</script>

<template>
	<UDashboardPanel id="support">
		<template #body>
			<div class="mx-auto w-full max-w-2xl space-y-8">
				<PageHeader
					title="Support"
					description="Answers to common questions about how AniTools works." />

				<div class="overflow-hidden rounded-lg border border-default">
					<CollapseButton
						v-for="(entry, index) in faq"
						:key="entry.question"
						:label="entry.question"
						:first="index === 0">
						<p class="text-sm text-toned">
							{{ entry.answer }}
						</p>
					</CollapseButton>
				</div>

				<UPageCard
					title="Still stuck?"
					description="Report a bug, ask a question, or suggest a feature on GitHub."
					:ui="{ container: 'gap-y-3' }">
					<UButton
						label="GitHub repository"
						icon="i-simple-icons-github"
						to="https://github.com/alexisdechiara/AniTools"
						target="_blank"
						color="neutral"
						variant="subtle"
						class="w-fit" />
				</UPageCard>
			</div>
		</template>
	</UDashboardPanel>
</template>

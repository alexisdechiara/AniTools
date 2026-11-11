<script setup lang="ts">
import type { NuxtError } from "#app"

const props = defineProps<{
	error: NuxtError
}>()

const statusCode = computed(() => {
	const code = Number(props.error.statusCode)
	return Number.isInteger(code) && code >= 400 && code <= 599 ? code : 500
})
const isNotFound = computed(() => statusCode.value === 404)
const title = computed(() => isNotFound.value ? "Page not found" : "Something went wrong")
const description = computed(() => isNotFound.value
	? "This page does not exist or has moved."
	: "An unexpected error stopped this page from loading. Try again, or go back home."
)
// Raw error text can carry file paths and stack frames: it is only ever shown in development.
const developmentDetails = computed(() => {
	if (!import.meta.dev) return ""
	const details = props.error.message || props.error.statusMessage || ""
	return details === title.value ? "" : details
})
// Only the status, a fixed title and a fixed sentence reach the visitor.
const displayedError = computed(() => ({
	statusCode: statusCode.value,
	statusMessage: title.value,
	message: description.value
}))

function goHome() {
	void clearError({ redirect: "/" })
}

function retry() {
	reloadNuxtApp({ force: true })
}

useSeoMeta({
	title,
	description,
	robots: "noindex"
})

useHead({
	htmlAttrs: {
		lang: "en"
	}
})
</script>

<template>
	<UApp>
		<UError :error="displayedError">
			<template #links>
				<UButton
					v-if="!isNotFound"
					size="lg"
					color="primary"
					icon="i-lucide-rotate-cw"
					label="Try again"
					@click="retry"/>
				<UButton
					size="lg"
					:color="isNotFound ? 'primary' : 'neutral'"
					:variant="isNotFound ? 'solid' : 'subtle'"
					icon="i-lucide-house"
					label="Back to home"
					@click="goHome"/>
			</template>
		</UError>
		<pre
			v-if="developmentDetails"
			class="mx-auto mb-8 max-w-3xl overflow-x-auto rounded-lg border border-default bg-muted p-4 text-xs whitespace-pre-wrap text-muted"
			data-testid="error-dev-details">{{ developmentDetails }}</pre>
	</UApp>
</template>

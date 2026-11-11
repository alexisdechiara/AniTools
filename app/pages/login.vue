<script setup lang="ts">
import {
	FEATURE_NAVIGATION_GROUPS,
	FEATURE_REGISTRY,
	featureNeedsProfile,
	findFeatureByPath
} from "#shared/config/features"
import { getSafeInternalPath } from "~/utils/navigation"

definePageMeta({
	layout: "none",
	feature: "login",
	auth: FEATURE_REGISTRY.login.access,
	indexable: FEATURE_REGISTRY.login.indexable
})

const seo = {
	title: "Login",
	description: "Connect securely with AniList or explore a public profile on AniTools."
}

useSeoMeta({
	title: seo.title,
	description: seo.description,
	ogTitle: seo.title,
	ogDescription: seo.description
})

const route = useRoute()
const toast = useToast()
const userStore = useUserStore()
const { fetchUserData } = userStore
const { loginWithAniList } = useAuth()

const username = ref("")
const isLoading = ref(false)
const profileError = ref<string | null>(null)

const navigationFeatures = FEATURE_NAVIGATION_GROUPS
	.filter(group => group.id !== "app")
	.flatMap(group => group.features)
	.map(featureId => ({ id: featureId, ...FEATURE_REGISTRY[featureId] }))
const publicTools = navigationFeatures.filter(feature => !featureNeedsProfile(feature.id))
const profileFeatures = navigationFeatures.filter(feature => featureNeedsProfile(feature.id))

// The route guard sends guests here with the page they asked for: say which one it was.
const requestedFeature = computed(() => {
	if (route.query.redirect === undefined) return null

	const featureId = findFeatureByPath(getSafeInternalPath(route.query.redirect, ""))
	return featureId && featureNeedsProfile(featureId) ? FEATURE_REGISTRY[featureId] : null
})

watch(username, () => {
	profileError.value = null
})
const canSubmit = computed(() => !isLoading.value && username.value.trim().length > 0)
// Text typed or autofilled before hydration lives only in the server-rendered input,
// and v-model overwrites it on mount: adopt it first so it survives hydration.
onBeforeMount(() => {
	const prefilled = document.querySelector<HTMLInputElement>("#anilist-username")?.value
	if (prefilled && !username.value) username.value = prefilled
})

const AUTH_ERROR_MESSAGES: Record<string, { title: string, description: string }> = {
	unavailable: {
		title: "AniList sign-in isn't available",
		description: "This server isn't set up for AniList sign-in right now. You can still open a public profile below."
	},
	rate_limited: {
		title: "Too many sign-in attempts",
		description: "Wait a minute, then try again."
	}
}
const DEFAULT_AUTH_ERROR_MESSAGE = {
	title: "AniList sign-in didn't finish",
	description: "The authorization was cancelled or has expired. Try again, or open a public profile instead."
}

const authError = route.query.authError?.toString()
if (authError) {
	// Only fixed copy is shown: the raw query value is used as a lookup key and never rendered.
	const message = Object.hasOwn(AUTH_ERROR_MESSAGES, authError)
		? AUTH_ERROR_MESSAGES[authError]
		: DEFAULT_AUTH_ERROR_MESSAGE
	toast.add({
		...message,
		color: "error",
		icon: "i-lucide-circle-alert"
	})
}

/** AniList answers 404 for an unknown username; anything else is an upstream or network failure. */
function isUnknownProfile(error: unknown): boolean {
	if (typeof error !== "object" || error === null || !("statusCode" in error)) return false

	const { statusCode } = error
	return typeof statusCode === "number" && statusCode === 404
}

async function loadPublicProfile() {
	const candidate = username.value.trim()
	if (!candidate) return

	isLoading.value = true
	profileError.value = null
	try {
		const profile = await fetchUserData(candidate)
		if (!profile.id) {
			throw createError({ statusCode: 404, statusMessage: "Unknown AniList profile" })
		}

		await navigateTo(getSafeInternalPath(route.query.redirect, "/"), { replace: true })
	} catch (error: unknown) {
		profileError.value = isUnknownProfile(error)
			? `AniList has no public profile called "${candidate}". Check the spelling: usernames must match exactly.`
			: "AniList didn't answer. Wait a few seconds, then try again."
	} finally {
		isLoading.value = false
	}

	if (profileError.value) {
		// The field is disabled while loading: refocus it once re-enabled so the name can be fixed.
		await nextTick()
		document.querySelector<HTMLInputElement>("#anilist-username")?.focus()
	}
}
</script>

<template>
	<div class="flex min-h-dvh items-center justify-center bg-default p-4 sm:p-8">
		<section
			class="login-hero w-full max-w-100 border border-transparent bg-[linear-gradient(165deg,var(--color-hero-surface-from),var(--color-hero-surface-to))] bg-origin-border px-5 py-6 text-white shadow-2xl sm:px-8 sm:py-9 dark:border-accented"
			aria-labelledby="login-title">
			<div class="mb-6 flex items-center gap-2.5">
				<span
					class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-lg font-black text-white"
					aria-hidden="true">
					A
				</span>
				<span class="text-2xl font-bold tracking-tight">
					<span class="text-primary-400">Ani</span>Tools
				</span>
			</div>

			<p
				v-if="requestedFeature"
				data-login-reason
				class="mb-4 flex items-start gap-2 rounded-xl bg-white/8 px-3 py-2.5 text-sm leading-snug text-white/90">
				<UIcon name="i-lucide-lock" class="mt-0.5 size-4 shrink-0 text-white/65" aria-hidden="true" />
				<span>
					Connect a profile to open {{ requestedFeature.label }}.
					<span class="text-white/65">It reads your AniList anime list.</span>
				</span>
			</p>

			<h1 id="login-title" class="mb-2 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
				Your AniList, with tools.
			</h1>
			<p class="mb-6 text-sm leading-relaxed text-white/65">
				Dashboard, statistics, Rewind, tier lists and share cards — your anime year in one place.
			</p>

			<button
				type="button"
				class="flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-brand-anilist text-base font-semibold text-hero-ink transition-colors hover:bg-brand-anilist-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
				@click="loginWithAniList()">
				<UIcon name="i-custom-anilist" class="size-5" aria-hidden="true" />
				Sign in with AniList
			</button>

			<div class="my-5 flex items-center gap-3 text-xs text-white/50">
				<span class="h-px flex-1 bg-white/15" />
				or a public profile
				<span class="h-px flex-1 bg-white/15" />
			</div>

			<form @submit.prevent="loadPublicProfile">
				<label for="anilist-username" class="sr-only">AniList username</label>
				<div
					class="flex h-13 items-center gap-2 rounded-full border bg-white/8 ps-4 pe-1.5"
					:class="profileError ? 'border-error-400' : 'border-white/15 focus-within:border-white/30'">
					<UIcon name="i-lucide-user-round" class="size-4.5 shrink-0 text-white/60" aria-hidden="true" />
					<input
						id="anilist-username"
						v-model="username"
						name="username"
						type="text"
						autocomplete="username"
						placeholder="AniList username"
						:aria-describedby="profileError ? 'public-profile-error public-profile-help' : 'public-profile-help'"
						:aria-invalid="profileError ? 'true' : undefined"
						:disabled="isLoading"
						:maxlength="50"
						class="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/55 sm:text-sm">
					<button
						type="submit"
						:disabled="!canSubmit"
						class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary-500 px-4 text-sm font-semibold text-white transition-opacity hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-45">
						<UIcon
							v-if="isLoading"
							name="i-lucide-loader-circle"
							class="size-4 animate-spin"
							aria-hidden="true" />
						View profile
					</button>
				</div>
				<p
					v-if="profileError"
					id="public-profile-error"
					role="alert"
					class="mt-2 flex items-start gap-1.5 px-2 text-xs leading-relaxed text-error-300">
					<UIcon name="i-lucide-circle-alert" class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
					{{ profileError }}
				</p>
			</form>

			<p id="public-profile-help" class="mt-5 text-center text-[0.7rem] leading-relaxed text-white/50">
				Public profiles are read-only. No AniList token ever reaches the browser.
			</p>

			<section aria-labelledby="profile-features-title" class="mt-6 border-t border-white/10 pt-5">
				<h2 id="profile-features-title" class="mb-3 text-center text-xs font-medium text-white/65">
					With a profile
				</h2>
				<ul class="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-medium text-white/85">
					<li
						v-for="feature in profileFeatures"
						:key="feature.id"
						class="inline-flex items-center gap-1.5">
						<UIcon :name="feature.icon" class="size-4 text-white/65" aria-hidden="true" />
						{{ feature.label }}
					</li>
				</ul>
			</section>

			<nav aria-labelledby="public-tools-title" class="mt-5 border-t border-white/10 pt-5">
				<h2 id="public-tools-title" class="mb-3 text-center text-xs font-medium text-white/65">
					No account needed for these
				</h2>
				<ul class="grid grid-cols-3 gap-2">
					<li v-for="tool in publicTools" :key="tool.id">
						<NuxtLink
							:to="tool.path"
							class="flex flex-col items-center gap-1.5 rounded-2xl bg-white/6 px-2 py-3 text-xs font-medium text-white/85 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
							<UIcon :name="tool.icon" class="size-5" aria-hidden="true" />
							{{ tool.label }}
						</NuxtLink>
					</li>
				</ul>
			</nav>
		</section>
	</div>
</template>

<style scoped>
.login-hero {
	border-radius: 2rem;
}

@supports (corner-shape: squircle) {
	.login-hero {
		corner-shape: squircle;
		border-radius: clamp(2rem, 9vw, 4.5rem);
	}
}
</style>

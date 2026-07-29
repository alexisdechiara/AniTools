<template>
	<div
		class="fixed max-w-4xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-video h-fit w-full flex flex-col p-24 bg-neutral-900 squircle">
		<h1 class="text-6xl font-bold text-white dark:text-neutral-300 mb-4">
			<span class="text-primary-400 me-1">Ani</span>Tools
		</h1>
		<h2 class="text-2xl text-white">Your anime year, lists and calendar in one place.</h2>
		<div class="mt-auto flex flex-col gap-5">
			<UButton
				label="Continue with AniList"
				icon="i-simple-icons-anilist"
				size="xl"
				block
				class="h-16 rounded-full justify-center"
				@click="loginWithAniList()" />

			<div class="flex items-center gap-3 text-neutral-400">
				<USeparator class="flex-1" />
				<span class="text-sm">or view a public profile</span>
				<USeparator class="flex-1" />
			</div>

			<UInput v-model="username" placeholder="AniList username"
				:ui="{ base: 'h-16 ps-8 rounded-full text-base', trailing: '-end-12' }" @keyup.enter="loadPublicProfile">
				<template #trailing>
					<UButton aria-label="Load public AniList profile" @click="loadPublicProfile" :ui="{
						base:
							'size-full cursor-pointer rounded-full px-8 hover:bg-primary-400 active:bg-primary-400',
					}">
						<Icon name="lucide:loader-circle" class="size-8 animate-spin" v-if="isLoading" />
						<Icon name="lucide:arrow-right" class="size-8" v-else />
					</UButton>
				</template>
			</UInput>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ScoreFormat } from "#gql/default";
import { FEATURE_REGISTRY } from "#shared/config/features";
const { isLoading, start } = useLoadingIndicator();

definePageMeta({
	layout: "none",
	feature: "login",
	auth: FEATURE_REGISTRY.login.access,
	indexable: FEATURE_REGISTRY.login.indexable
});

const route = useRoute();
const seo = {
	title: "Login",
	description: "Sign in to AniTools with your AniList username."
};

useSeoMeta({
	title: seo.title,
	description: seo.description,
	ogTitle: seo.title,
	ogDescription: seo.description
});

const toast = useToast();
const username = ref("");

const userStore = useUserStore();
const { fetchUserData } = userStore;
const { fetchStatistics } = useStatisticsStore();
const { fetchAllAnimes } = useEntriesStore();
const { loginWithAniList } = useAuth();

if (route.query.authError) {
	toast.add({
		title: "AniList login failed",
		description: "The authorization could not be completed. Please try again.",
		color: "error",
		icon: "i-lucide-circle-alert"
	});
}

const loadPublicProfile = async () => {
	if (!username.value.trim()) {
		toast.add({
			title: "Error",
			description: "Please enter a username",
			color: "error",
			icon: "i-heroicons-exclamation-circle",
		});
		return;
	} else {
		start();
	}

	try {

		// Récupérer les données de l'utilisateur
		const userData = await fetchUserData(username.value);
		if (!userData.id) {
			throw new Error("User not found");
		}

		// Utiliser l'ID de l'utilisateur pour charger les statistiques
		await fetchStatistics(userData.id);
		await fetchAllAnimes(
			userData.id,
			userData.mediaListOptions?.scoreFormat || ScoreFormat.POINT_100
		);

		// Rediriger vers la page d'accueil ou l'URL de redirection
		const redirectTo = route.query.redirect?.toString() || "/";
		await navigateTo(redirectTo, { replace: true });
	} catch (error: any) {
		toast.add({
			title: "Profile error",
			description: error.message || "An error occurred during login",
			color: "error",
			icon: "i-lucide-circle-alert",
		});
	}
};
</script>

<style>
@supports (corner-shape: squircle) {
	.squircle {
		corner-shape: squircle !important;
		border-radius: 9rem;
	}
}

@supports not (corner-shape: squircle) {
	.squircle {
		border-radius: 4rem !important;
	}
}
</style>

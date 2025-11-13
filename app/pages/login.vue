<template>
  <div
    class="fixed max-w-4xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-video h-fit w-full flex flex-col p-24 bg-neutral-900 rounded-[8rem] squircle"
  >
    <h1 class="text-6xl font-bold text-white dark:text-neutral-300 mb-4">
      <span class="text-primary-400 me-1">Ani</span>Tools
    </h1>
    <h2 class="text-2xl text-white">The awesome anime tools</h2>
    <div class="mt-auto">
      <UInput
        v-model="username"
        placeholder="Enter your username"
        :ui="{ base: 'h-16 ps-8 rounded-full text-base', trailing: '-end-12' }"
        @keyup.enter="login"
      >
        <template #trailing>
          <UButton
            @click="login"
            :ui="{
              base:
                'size-full cursor-pointer rounded-full px-8 hover:bg-primary-400 active:bg-primary-400',
            }"
          >
            <Icon
              name="lucide:loader-circle"
              class="size-8 animate-spin"
              v-if="isLoading"
            />
            <Icon name="lucide:arrow-right" class="size-8" v-else />
          </UButton>
        </template>
      </UInput>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ScoreFormat } from "#gql/default";
const { isLoading } = useLoadingIndicator();

definePageMeta({
  layout: "none",
});

const route = useRoute();
const toast = useToast();
const username = ref("");

const { fetchUserData } = useUserStore();
const { fetchStatistics } = useStatisticsStore();
const { fetchAllAnimes } = useEntriesStore();

const login = async () => {
  if (!username.value.trim()) {
    toast.add({
      title: "Error",
      description: "Please enter a username",
      color: "error",
      icon: "i-heroicons-exclamation-circle",
    });
    return;
  }

  try {
    // Récupérer les données de l'utilisateur
    const userData = await fetchUserData(username.value);

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
    console.error("Login error:", error);

    toast.add({
      title: "Login Error",
      description: error.message || "An error occurred during login",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
};
</script>

<style>
.squircle {
  corner-shape: squircle !important;
}
</style>

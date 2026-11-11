<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const { loginWithAniList, logout } = useAuth();

defineProps<{
  collapsed?: boolean;
}>();

const colorMode = useColorMode();
const appConfig = useAppConfig();

const colors = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];
const neutrals = ["slate", "gray", "zinc", "neutral", "stone"];

const user = useUserStore();
const accountLabel = computed(() => user.isAuthenticated ? user.username : "Guest");
// A public profile is somebody's list opened by name: nothing can be changed from here.
const isPublicProfile = computed(() => user.isAuthenticated && user.authMode === "public");
const PUBLIC_PROFILE_NOTE = "Public profile · read-only";

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: "label",
      label: user.isOAuthAuthenticated
        ? `${user.username} · AniList`
        : user.isAuthenticated
          ? `${user.username} · Public profile`
          : "Guest",
      avatar: user.avatar,
    },
  ],
  [
		{
      label: "Theme",
      icon: "i-lucide-palette",
      children: [
        {
          label: "Primary",
          slot: "chip",
          chip: appConfig.ui.colors.primary,
          content: {
            align: "center",
            collisionPadding: 16,
          },
          children: colors.map((color) => ({
            label: color,
            chip: color,
            slot: "chip",
            checked: appConfig.ui.colors.primary === color,
            type: "checkbox",
            onSelect: (e) => {
              e.preventDefault();

              appConfig.ui.colors.primary = color;
            },
          })),
        },
        {
          label: "Neutral",
          slot: "chip",
          chip:
            appConfig.ui.colors.neutral === "neutral"
              ? "old-neutral"
              : appConfig.ui.colors.neutral,
          content: {
            align: "end",
            collisionPadding: 16,
          },
          children: neutrals.map((color) => ({
            label: color,
            chip: color === "neutral" ? "old-neutral" : color,
            slot: "chip",
            type: "checkbox",
            checked: appConfig.ui.colors.neutral === color,
            onSelect: (e) => {
              e.preventDefault();

              appConfig.ui.colors.neutral = color;
            },
          })),
        },
      ],
    },
    {
      label: "Appearance",
      icon: "i-lucide-sun-moon",
      children: [
        {
          label: "Light",
          icon: "i-lucide-sun",
          type: "checkbox",
          checked: colorMode.value === "light",
          onSelect(e: Event) {
            e.preventDefault();

            colorMode.preference = "light";
          },
        },
        {
          label: "Dark",
          icon: "i-lucide-moon",
          type: "checkbox",
          checked: colorMode.value === "dark",
          onSelect(e: Event) {
            e.preventDefault();

            colorMode.preference = "dark";
          },
        },
      ],
    },
  ],
  [
		{
      label: "GitHub repository",
      icon: "i-simple-icons-github",
			to: "https://github.com/alexisdechiara/AniTools",
      target: "_blank",
    },
    user.isAuthenticated
      ? {
          label: user.isOAuthAuthenticated ? "Log out" : "Forget this profile",
          icon: "i-lucide-log-out",
          onSelect() {
            logout();
          },
        }
      : {
          label: "Continue with AniList",
          icon: "i-custom-anilist",
          onSelect() {
            loginWithAniList();
          },
        },
  ],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
		:ui="{ item: 'items-center', content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
    class="py-3"
  >
    <UButton
      :avatar="user.avatar"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      :aria-label="isPublicProfile
        ? `Open account menu for ${accountLabel} (public profile, read-only)`
        : `Open account menu for ${accountLabel}`"
      :title="collapsed && isPublicProfile ? `${accountLabel} · ${PUBLIC_PROFILE_NOTE}` : undefined"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    >
      <span v-if="!collapsed" class="min-w-0 flex-1 text-start">
        <span class="block truncate">{{ accountLabel }}</span>
        <span
          v-if="isPublicProfile"
          data-public-profile-note
          class="block truncate text-xs font-normal text-muted">{{ PUBLIC_PROFILE_NOTE }}</span>
      </span>
    </UButton>

    <template #chip-leading="{ item }">
      <span
        :style="{
	'--chip-light': `var(--color-${(item as DropdownMenuItem).chip}-500)`,
	'--chip-dark': `var(--color-${(item as DropdownMenuItem).chip}-400)`,
}"
        class="ms-0.5 size-2 rounded-full bg-(--chip-light) dark:bg-(--chip-dark)"
      />
    </template>
  </UDropdownMenu>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
	active?: boolean
	confirmed?: boolean
	visible?: boolean
}>(), {
	active: false,
	confirmed: false,
	visible: false
})
</script>

<template>
	<Transition name="delete-target">
		<div
			v-if="visible"
			class="pointer-events-none fixed bottom-6 left-1/2 z-100 flex -translate-x-1/2 flex-col items-center gap-2"
			role="status"
			aria-live="polite">
			<div
				data-dashboard-delete-target
				:data-active="active || confirmed"
				:data-confirmed="confirmed"
				class="flex size-20 items-center justify-center rounded-full border-2 border-default bg-elevated/95 text-muted shadow-2xl backdrop-blur-xl">
				<UIcon
					:name="confirmed ? 'i-lucide-check' : 'i-lucide-trash-2'"
					class="size-8"
					aria-hidden="true" />
			</div>
			<span
				class="rounded-full bg-inverted px-3 py-1 text-xs font-semibold text-inverted shadow-lg">
				{{ confirmed ? "Card removed" : active ? "Release to remove" : "Drop to remove" }}
			</span>
		</div>
	</Transition>
</template>

<style scoped>
[data-dashboard-delete-target] {
	transition:
		background-color 180ms ease,
		border-color 180ms ease,
		box-shadow 180ms ease,
		color 180ms ease,
		transform 180ms cubic-bezier(0.2, 0.9, 0.2, 1.25);
}

[data-dashboard-delete-target][data-active="true"] {
	border-color: var(--ui-error);
	background: var(--ui-error);
	color: white;
	box-shadow:
		0 18px 55px color-mix(in srgb, var(--ui-error) 42%, transparent),
		0 0 0 10px color-mix(in srgb, var(--ui-error) 12%, transparent);
	transform: scale(1.14);
	animation: delete-target-pulse 720ms ease-in-out infinite alternate;
}

[data-dashboard-delete-target][data-confirmed="true"] {
	animation: delete-target-confirm 280ms cubic-bezier(0.2, 0.9, 0.2, 1.35) both;
}

.delete-target-enter-active,
.delete-target-leave-active {
	transition: opacity 180ms ease, transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.delete-target-enter-from,
.delete-target-leave-to {
	opacity: 0;
	transform: translate(-50%, 1.5rem) scale(0.78);
}

@keyframes delete-target-pulse {
	to { transform: scale(1.2); }
}

@keyframes delete-target-confirm {
	0% { transform: scale(1.14); }
	55% { transform: scale(1.32); }
	100% { transform: scale(1.14); }
}

@media (prefers-reduced-motion: reduce) {
	[data-dashboard-delete-target],
	[data-dashboard-delete-target][data-active="true"],
	[data-dashboard-delete-target][data-confirmed="true"],
	.delete-target-enter-active,
	.delete-target-leave-active {
		animation: none;
		transition-duration: 1ms;
	}
}
</style>

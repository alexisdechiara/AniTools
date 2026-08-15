<script setup lang="ts">
withDefaults(defineProps<{
	description?: string
	label?: string
}>(), {
	description: "Aligning your widgets and loading the latest AniList data.",
	label: "Getting everything ready"
})
</script>

<template>
	<div
		class="absolute inset-0 isolate z-60 flex min-h-svh w-full items-center justify-center overflow-hidden bg-default px-6 py-16"
		data-page-loader
		role="status"
		aria-live="polite"
		aria-busy="true">
		<div data-loader-glow data-loader-glow-primary aria-hidden="true" />
		<div data-loader-glow data-loader-glow-secondary aria-hidden="true" />
		<div class="relative flex max-w-sm flex-col items-center text-center">
			<div class="relative mb-7 flex size-24 items-center justify-center" aria-hidden="true">
				<span data-loader-orbit data-loader-orbit-outer />
				<span data-loader-orbit data-loader-orbit-inner />
				<span data-loader-core>A</span>
				<span data-loader-satellite />
			</div>
			<p class="text-base font-semibold text-highlighted sm:text-lg">
				{{ label }}
			</p>
			<p class="mt-1.5 text-sm text-muted">
				{{ description }}
			</p>
		</div>
	</div>
</template>

<style scoped>
[data-loader-glow] {
	position: absolute;
	width: 18rem;
	height: 18rem;
	border-radius: 9999px;
	filter: blur(72px);
	opacity: 0.14;
	will-change: transform;
}

[data-loader-glow-primary] {
	top: 8%;
	left: 18%;
	background: var(--ui-primary);
	animation: loader-drift-primary 8s ease-in-out infinite alternate;
}

[data-loader-glow-secondary] {
	right: 16%;
	bottom: 4%;
	background: var(--ui-color-primary-300);
	animation: loader-drift-secondary 9.5s ease-in-out -3.2s infinite alternate;
}

[data-loader-orbit] {
	position: absolute;
	border-radius: 9999px;
	border: 1px solid color-mix(in srgb, var(--ui-primary) 42%, transparent);
}

[data-loader-orbit-outer] {
	inset: 0;
	border-top-color: var(--ui-primary);
	animation: loader-spin 1.8s linear infinite;
}

[data-loader-orbit-inner] {
	inset: 0.75rem;
	border-right-color: var(--ui-primary);
	animation: loader-spin-reverse 1.2s linear infinite;
}

[data-loader-core] {
	display: flex;
	width: 3.25rem;
	height: 3.25rem;
	align-items: center;
	justify-content: center;
	border-radius: 1rem;
	background: var(--ui-primary);
	color: var(--ui-text-inverted);
	font-size: 1.25rem;
	font-weight: 800;
	box-shadow: 0 16px 40px color-mix(in srgb, var(--ui-primary) 28%, transparent);
	animation: loader-core-pulse 1.6s ease-in-out infinite;
}

[data-loader-satellite] {
	position: absolute;
	top: 0.2rem;
	left: 50%;
	width: 0.55rem;
	height: 0.55rem;
	margin-left: -0.275rem;
	border-radius: 9999px;
	background: var(--ui-primary);
	box-shadow: 0 0 18px var(--ui-primary);
	transform-origin: 0.275rem 2.8rem;
	animation: loader-satellite 1.8s linear infinite;
}

@keyframes loader-spin {
	to { transform: rotate(360deg); }
}

@keyframes loader-spin-reverse {
	to { transform: rotate(-360deg); }
}

@keyframes loader-satellite {
	to { transform: rotate(360deg); }
}

@keyframes loader-core-pulse {
	50% { transform: scale(0.92); opacity: 0.84; }
}

@keyframes loader-drift-primary {
	0% { transform: translate3d(-2rem, 1rem, 0) scale(0.92); opacity: 0.12; }
	45% { transform: translate3d(7rem, -4rem, 0) scale(1.28); opacity: 0.23; }
	100% { transform: translate3d(13rem, 5rem, 0) scale(1.05); opacity: 0.17; }
}

@keyframes loader-drift-secondary {
	0% { transform: translate3d(3rem, 2rem, 0) scale(1.18); opacity: 0.2; }
	50% { transform: translate3d(-9rem, -5rem, 0) scale(0.9); opacity: 0.12; }
	100% { transform: translate3d(-15rem, 3rem, 0) scale(1.3); opacity: 0.24; }
}

@media (prefers-reduced-motion: reduce) {
	[data-loader-glow],
	[data-loader-orbit],
	[data-loader-core],
	[data-loader-satellite] {
		animation-duration: 0.001ms;
		animation-iteration-count: 1;
	}
}
</style>

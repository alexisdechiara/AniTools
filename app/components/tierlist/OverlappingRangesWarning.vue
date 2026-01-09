<template>
	<UModal v-model:open="isOpen" title="Inconsistency Detected" :ui="{ content: 'max-w-xs' }">
		<template #body>
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Overlapping tier ranges have been detected. Animes with scores in these ranges will be duplicated in the
					corresponding tiers.
				</p>
				<div class="space-y-2">
					<p class="text-sm font-medium">Affected ranges:</p>
					<ul class="text-sm text-muted-foreground space-y-1">
						<li v-for="overlap in overlappingRanges" :key="overlap" class="flex items-center gap-2">
							<UIcon name="i-lucide-alert-triangle" class="text-warning size-4" />
							{{ overlap }}
						</li>
					</ul>
				</div>
				<p class="text-sm text-muted-foreground">
					Do you want to continue with entry duplication?
				</p>
			</div>
		</template>
		<template #footer>
			<UButton label="Cancel" variant="outline" @click="handleCancel" />
			<UButton label="Continue with Duplication" color="primary" @click="handleConfirm" :loading="isLoading"
				:disabled="isLoading" />
		</template>
	</UModal>
</template>

<script lang="ts" setup>
interface Props {
	open: boolean
	overlappingRanges: string[]
	isLoading?: boolean
}

interface Emits {
	(e: 'update:open', value: boolean): void
	(e: 'confirm'): void
	(e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
	get: () => props.open,
	set: (value) => emit('update:open', value)
})

function handleConfirm() {
	emit('confirm')
	emit('update:open', false)
}

function handleCancel() {
	emit('cancel')
	emit('update:open', false)
}
</script>

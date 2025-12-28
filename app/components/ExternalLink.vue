<template>
	<UTooltip :text="props.site" :delay-duration="0" :content="{ side: 'right', sideOffset: 4 }">
		<NuxtLink :to="url" target="_blank" :style="{ '--simple-icons-color': color || 'black' }"
			class="bg-(--simple-icons-color) rounded-sm flex justify-center items-center size-6">
			<Icon :name="getSiteIcon()" :class="{ 'p-1': padding }" class="text-inverted" />
		</NuxtLink>
	</UTooltip>
</template>

<script lang="ts" setup>
const props = defineProps({
	site: {
		type: String,
		required: true,
	},
	url: {
		type: String,
		required: true,
	},
	color: {
		type: String,
		default: null,
	},
})

const padding = ref(true)

const getSiteIcon = () => {
	if (props.site) {
		switch (props.site.toLowerCase()) {
			case "official site":
				return "i-lucide-external-link"
			case "twitter":
			case "x":
				return "i-simple-icons-x"
			case "facebook":
				return "i-simple-icons-facebook"
			case "instagram":
				return "i-simple-icons-instagram"
			case "tiktok":
				return "i-simple-icons-tiktok"
			case "youtube":
				return "i-simple-icons-youtube"
			case "crunchyroll":
				return "i-simple-icons-crunchyroll"
			case "hulu":
				return "i-cib-hulu"
			case "netflix":
				return "i-cib-netflix"
			case "bilibili tv":
				return "i-simple-icons-bilibili"
			case "adult swim":
				return "i-arcticons-adultswim"
			case "funimation":
				return "i-custom-funimation"
			case "wakanim":
				return "i-custom-wakanim"
			case "hidive":
				return "i-custom-hidive"
			case "iq":
				return removePadding("i-custom-iqiyi")
			case "disney plus":
				return removePadding("i-custom-disneyplus")
			case "amazon prime video":
				return removePadding("i-custom-primevideo")
			case "hbo max":
				return removePadding("i-custom-hbomax")
			case "max":
				return removePadding("i-custom-max")
			case "tubi tv":
				return "i-simple-icons-tubi"
			default:
				return "i-lucide-external-link"
		}
	}
	return ""
}

const removePadding = (value: string) => {
	padding.value = false
	return value
}
</script>

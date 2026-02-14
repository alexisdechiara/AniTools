<template>
	<pre>
		{{ data }}
	</pre>
</template>

<script lang="ts" setup>
const { fetchAllSimuldub } = useSimuldub()

const { data } = await fetchAllSimuldub()

console.log(data.value)
</script>

<script setup>
const colorMode = useColorMode()

const isDark = computed({
    get() {
        return colorMode.value === 'dark'
    },
    set() {
        colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    },
})
</script>

<template>
    <ClientOnly v-if="!colorMode?.forced">
        <UButton
            :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
            color="neutral"
            variant="outline"
            size="xl"
            @click="isDark = !isDark"
        />

        <template #fallback>
            <UButton
                icon="i-lucide-loader-circle"
                color="neutral"
                variant="outline"
                size="xl"
            />
        </template>
    </ClientOnly>
</template>

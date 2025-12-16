<script setup lang="ts">
import { OModalsContainer, useModals } from '@outloud/vue-modals'

useHead({
    title: 'Cart Helper',
})

const modals = useModals()
const $content = ref<HTMLElement>()

modals.content = $content
</script>

<template>
    <NuxtLoadingIndicator />
    <div>
        <div ref="$content">
            <UApp>
                <NuxtPage />
            </UApp>
        </div>
        <OModalsContainer />
    </div>
</template>

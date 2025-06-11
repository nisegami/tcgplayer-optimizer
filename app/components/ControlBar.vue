<script lang="ts" setup>
const toast = useToast()
const queryClient = useQueryClient()

const newProductUrl = ref('')
const isScraping = ref(false)
const isRefreshing = ref(false)

async function handleUrlSubmit() {
    if (!newProductUrl.value)
        return

    try {
        isScraping.value = true
        const productId = newProductUrl.value.startsWith('http') ? extractProductIdFromUrl(newProductUrl.value) : newProductUrl.value

        await $fetch('/api/scrape', {
            method: 'POST',
            body: { productId },
        })

        toast.add({
            title: 'Success!',
            description: 'New card has been scraped successfully',
            color: 'success',
            icon: 'i-lucide-check',
        })
    }
    catch (error) {
        console.error('Scraping failed:', error)
        toast.add({
            title: 'Scraping Failed',
            description: error instanceof Error ? error.message : 'Unknown error occurred',
            color: 'error',
            icon: 'i-lucide-alert-triangle',
        })
    }
    finally {
        isScraping.value = false
        newProductUrl.value = ''
    }
}

async function refreshPrintings() {
    try {
        isRefreshing.value = true
        const data = await $fetch('/api/printings/refresh', {
            method: 'POST',
        })

        toast.add({
            title: 'Refresh Complete',
            description: `Successfully refreshed ${data.refreshedCount} printings with ${data.errorCount} errors`,
            color: data.errorCount > 0 ? 'warning' : 'success',
            icon: data.errorCount > 0 ? 'i-lucide-alert-circle' : 'i-lucide-check-circle',
        })

        queryClient.refetchQueries({ queryKey: ['sellers'] })
        queryClient.refetchQueries({ queryKey: ['cards'] })
    }
    catch (error) {
        console.error('Refresh failed:', error)
        toast.add({
            title: 'Refresh Failed',
            description: error instanceof Error ? error.message : 'Unknown error occurred',
            color: 'error',
            icon: 'i-lucide-x-circle',
        })
    }
    finally {
        isRefreshing.value = false
    }
}

function extractProductIdFromUrl(url: string) {
    const regex = /\/product\/(\d+)\//
    const match = url.match(regex)
    return match ? match[1] : null
}
</script>

<template>
    <div class="w-full p-2 flex flex-row space-x-3">
        <ColorModeButton />
        <div class="h-full flex-grow flex flex-row space-x-2">
            <UInput
                v-model="newProductUrl"
                type="url"
                required
                class="flex-grow mr-2"
                pattern="https:\/\/www\.tcgplayer\.com\/product\/\d+.*"
            />
            <UButton
                :disabled="isScraping"
                icon="i-lucide-plus"
                size="xl"
                color="info"
                @click="handleUrlSubmit"
            />
        </div>
        <UButton
            :disabled="isRefreshing"
            icon="i-lucide-refresh-cw"
            size="xl"
            @click="refreshPrintings"
        />
        <NuxtLink to="/want-list">
            <UButton
                icon="i-lucide-list"
                size="xl"
                color="gray"
                title="View Want List"
            />
        </NuxtLink>
    </div>
</template>

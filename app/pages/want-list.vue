<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query'

const toast = useToast()

const { data: wantListData, isLoading } = useQuery({
    queryKey: ['want-list'],
    queryFn: () => $fetch('/api/want-list'),
})

function formatPrintings(printings: Printing[]): string {
    return printings
        .map(printing => `${printing.desiredQuantity}x ${printing.rarity} from ${printing.setName}`)
        .join(' OR ')
}

const formattedWantList = computed(() => {
    if (!wantListData.value) return ''

    return wantListData.value
        .map(({ card, printings }) => `${card.name} - ${formatPrintings(printings)}`)
        .join('\n')
})

async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(formattedWantList.value)
        toast.add({
            title: 'Copied!',
            description: 'Want list copied to clipboard',
            color: 'success',
            icon: 'i-lucide-check',
        })
    }
    catch {
        toast.add({
            title: 'Copy Failed',
            description: 'Unable to copy to clipboard',
            color: 'error',
            icon: 'i-lucide-x',
        })
    }
}
</script>

<template>
    <div class="container mx-auto p-6">
        <div class="mb-6">
            <div class="flex items-center gap-4 mb-4">
                <NuxtLink to="/">
                    <UButton
                        icon="i-lucide-arrow-left"
                        size="sm"
                        color="gray"
                        variant="outline"
                    >
                        Back to Dashboard
                    </UButton>
                </NuxtLink>
            </div>
            <div class="flex items-center justify-between">
                <h3 class="font-semibold text-lg text-gray-900 dark:text-white">
                    Arshad's Want List ({{ wantListData.length }} cards)
                </h3>
                <UButton
                    icon="i-lucide-copy"
                    size="sm"
                    color="primary"
                    @click="copyToClipboard"
                >
                    Copy to Clipboard
                </UButton>
            </div>
        </div>

        <div
            v-if="isLoading"
            class="space-y-4"
        >
            <USkeleton
                v-for="i in 10"
                :key="i"
                class="h-12 w-full"
            />
        </div>

        <div
            v-else-if="wantListData && wantListData.length > 0"
            class="space-y-4"
        >
            <ul class="space-y-2">
                <li
                    v-for="{ card, printings } in wantListData"
                    :key="card.id"
                    class="flex items-start"
                >
                    <span class="text-gray-400 dark:text-gray-500 mr-3 mt-1">•</span>
                    <div class="flex-1">
                        <span class="font-medium text-gray-900 dark:text-white">
                            {{ card.name }}
                        </span>
                        <span class="text-gray-600 dark:text-gray-400">
                            - {{ formatPrintings(printings) }}
                        </span>
                    </div>
                </li>
            </ul>
        </div>

        <div
            v-else
            class="text-center py-12"
        >
            <UIcon
                name="i-heroicons-document-text"
                class="w-12 h-12 text-gray-400 mx-auto mb-4"
            />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No cards in want list
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
                Add some cards with "Enabled" or "Hide" priority to see them here.
            </p>
        </div>
    </div>
</template>

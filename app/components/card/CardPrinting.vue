<script lang="ts" setup>
import { differenceInHours, formatDistanceToNow } from 'date-fns'
import { ModalPrintingListings, ModalPrintingSales } from '#components'

const props = defineProps<{ printing: Printing }>()

const toast = useToast()
const queryClient = useQueryClient()
const modals = useModals()

async function openOnTCGPlayer() {
    return await navigateTo(`https://www.tcgplayer.com/product/${props.printing.itemNo}`, { external: true, open: { target: '_blank' } })
}

async function modifyPrinting(body: PrintingUpdate) {
    await $fetch(`/api/printings/${props.printing.id}`, {
        method: 'PUT',
        body,
    })
    queryClient.refetchQueries({ queryKey: ['sellers'] })
    queryClient.refetchQueries({ queryKey: ['cards'] })
}

async function deleteListing() {
    await $fetch(`/api/printings/${props.printing.id}`, {
        method: 'DELETE',
    })
    queryClient.refetchQueries({ queryKey: ['sellers'] })
    queryClient.refetchQueries({ queryKey: ['cards'] })
}

async function refreshListings() {
    const body = {
        productId: props.printing.itemNo,
        includeListings: true,
        includeSales: true,
        listingCount: 50,
        salesCount: 100,
    }
    const result = await $fetch('/api/scrape', {
        method: 'POST',
        body,
    })

    const goodDealMessage = result.goodDealPrice
        ? ` Good deal price: ${formatPrice(result.goodDealPrice)}`
        : ''

    toast.add({
        title: `Scraped ${result.cardName} (${result.setCode})`,
        description: `Found ${result.numberOfListings} listings and ${result.numberOfSales || 0} sales.${goodDealMessage}`,
    })

    queryClient.refetchQueries({ queryKey: ['sellers'] })
    queryClient.refetchQueries({ queryKey: ['cards'] })
}

function openListingsModal() {
    modals.open(ModalPrintingListings, {
        props: {
            printingId: props.printing.id,
        },
    })
}

function openSalesModal() {
    modals.open(ModalPrintingSales, {
        props: {
            printingId: props.printing.id,
        },
    })
}

const priority = ref(props.printing.priority)
const desiredCondition = ref(props.printing.desiredCondition)
const desiredEdition = ref(props.printing.desiredEdition)
const desiredQuantity = ref(props.printing.desiredQuantity.toString())
const maxPrice = ref<number | undefined>(props.printing.maxPrice ?? undefined)

const lastScraped = (printing: Printing) => printing.lastScraped ? `Last refreshed ${formatDistanceToNow(printing.lastScraped)} ago` : 'Never scraped!'
const dataOutdated = (printing: Printing) => {
    if (printing.priority === 'DISABLED')
        return 'neutral'
    else if (!printing.lastScraped || Math.abs(differenceInHours(printing.lastScraped, new Date())) > 12)
        return 'error'
    else
        return 'primary'
}

watch(priority, async () => {
    await modifyPrinting({ priority: priority.value })
})

watch(desiredCondition, async () => {
    await modifyPrinting({ desiredCondition: desiredCondition.value })
})

watch(desiredEdition, async () => {
    await modifyPrinting({ desiredEdition: desiredEdition.value })
})

watch(desiredQuantity, async () => {
    await modifyPrinting({ desiredQuantity: Number(desiredQuantity.value) })
})

watch(maxPrice, async () => {
    await modifyPrinting({ maxPrice: maxPrice.value })
})
</script>

<template>
    <div class="grid grid-cols-12 gap-2 rounded-lg border border-neutral-300 dark:border-neutral-600 p-3 relative">
        <div class="col-span-12 flex flex-col items-center py-1">
            <div>{{ printing.rarity }} - {{ printing.setCode }}</div>
            <div class="flex items-center space-x-2">
                <span class="text-pink-500">Market Price: {{ formatPrice(printing.marketPrice) }}</span>
                <span
                    v-if="printing.goodDealPrice"
                    class="text-green-500"
                >
                    Good Deal: {{ formatPrice(printing.goodDealPrice) }}
                </span>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-4 flex space-x-2 items-center">
            <USelect
                v-model="desiredCondition"
                :items="conditionValues"
                class="w-full"
            />
        </div>
        <div class="col-span-6 xl:col-span-4 flex space-x-2 items-center">
            <USelect
                v-model="priority"
                :items="priorityValues"
                class="w-full"
            />
        </div>
        <div class="col-span-6 xl:col-span-4 flex space-x-2 items-center">
            <USelect
                v-model="desiredEdition"
                :items="editionValues"
                class="w-full"
            />
        </div>
        <div class="col-span-6 xl:col-span-3 flex space-x-2 items-center">
            <USelect
                v-model="desiredQuantity"
                :items="quantityValues"
                class="w-full"
            />
        </div>
        <div class="col-span-6 xl:col-span-3 flex space-x-2 items-center">
            <UInput
                v-model="maxPrice"
                icon="i-lucide-dollar-sign"
                type="number"
            />
        </div>
        <div class="col-span-12 xl:col-span-6 flex space-x-2 items-center justify-center">
            <UButton
                icon="i-lucide-trash"
                size="xl"
                variant="outline"
                color="warning"
                @click="deleteListing"
            />
            <UTooltip :text="lastScraped(printing)">
                <UButton
                    icon="i-lucide-refresh-cw"
                    :color="dataOutdated(printing)"
                    size="xl"
                    variant="outline"
                    @click="refreshListings"
                />
            </UTooltip>
            <UButton
                icon="i-lucide-external-link"
                size="xl"
                color="info"
                variant="outline"
                @click="openOnTCGPlayer()"
            />
            <UTooltip text="View Listings">
                <UButton
                    icon="i-lucide-list"
                    size="xl"
                    color="success"
                    variant="outline"
                    @click="openListingsModal"
                />
            </UTooltip>
            <UTooltip text="View Sales History">
                <UButton
                    icon="i-lucide-history"
                    size="xl"
                    color="primary"
                    variant="outline"
                    @click="openSalesModal"
                />
            </UTooltip>
        </div>
    </div>
</template>

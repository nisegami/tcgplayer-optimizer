<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const printingId = parseInt(route.params.id as string)

const { data: response, isLoading, suspense } = useQuery({
    queryKey: ['printing', 'listings', printingId],
    queryFn: async () => {
        return await $fetch(`/api/listings/${printingId}`)
    },
})

interface ListingRow {
    seller: string
    condition: 'NEAR MINT' | 'LIGHTLY PLAYED' | 'MODERATELY PLAYED' | 'HEAVILY PLAYED' | 'DAMAGED'
    edition: 'ANY' | '1ST EDITION' | 'LIMITED' | 'UNLIMITED'
    quantity: number
    price: string
    shipping: string
    total: string
    isGoodDeal?: boolean
}

const data = computed(() => {
    return response.value?.listings.flatMap((listing) => {
        const totalPrice = listing.price + (listing.seller?.shipping ?? 0)
        const isGoodDeal = !!(response.value?.printing?.goodDealPrice && totalPrice <= response.value?.printing?.goodDealPrice)

        return {
            seller: listing.seller?.name ?? '???',
            condition: listing.condition,
            edition: listing.edition,
            quantity: listing.quantity,
            price: formatPrice(listing.price),
            shipping: formatPrice(listing.seller?.shipping ?? 0),
            total: formatPrice(totalPrice),
            isGoodDeal,
        }
    }) ?? [] as ListingRow[]
})

const columns: TableColumn<ListingRow>[] = [
    {
        accessorKey: 'seller',
        header: 'Seller',
    },
    {
        accessorKey: 'condition',
        header: 'Condition',
    },
    {
        accessorKey: 'edition',
        header: 'Edition',
    },
    {
        accessorKey: 'quantity',
        header: 'Quantity',
    },
    {
        accessorKey: 'price',
        header: 'Price',
    },
    {
        accessorKey: 'shipping',
        header: 'Shipping',
    },
    {
        accessorKey: 'total',
        header: 'Total',
    },
]

onServerPrefetch(suspense)
</script>

<template>
    <div>
        <UContainer class="py-4">
            <div
                v-if="isLoading"
                class="flex justify-center my-4"
            >
                <UProgress animation="swing" />
            </div>
            <div v-else-if="response">
                <div class="flex flex-col gap-2 mb-6">
                    <UBreadcrumb
                        :links="[
                            { label: 'Home', to: '/' },
                            { label: response?.card?.name, to: '#' },
                            { label: 'Listings', to: '#' },
                        ]"
                    />

                    <h1 class="text-2xl font-bold">
                        {{ response?.card?.name }} - {{ response?.printing?.setName }} Listings
                    </h1>

                    <div class="text-gray-500">
                        {{ response?.printing?.setCode }} · {{ response?.printing?.rarity }}
                    </div>

                    <div class="flex items-center gap-2 flex-wrap">
                        <span>Market Price: {{ formatPrice(response?.printing?.marketPrice) }}</span>
                        <span
                            v-if="response?.printing?.goodDealPrice"
                            class="font-medium text-success"
                        >
                            Good Deal Price: {{ formatPrice(response?.printing?.goodDealPrice) }}
                        </span>
                        <NuxtLink
                            :to="`/printing/${printingId}/sales`"
                            class="text-primary flex items-center gap-1"
                        >
                            <UIcon name="i-lucide-history" />
                            View Sales History
                        </NuxtLink>
                    </div>
                </div>

                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-semibold">
                                Available Listings
                            </h2>
                            <UBadge>{{ response?.listings?.length || 0 }} listings</UBadge>
                        </div>
                    </template>

                    <div class="overflow-x-auto">
                        <UTable
                            :data
                            :columns
                            :row-class="(row: ListingRow) => row.isGoodDeal ? 'bg-green-100 dark:bg-green-950' : ''"
                        />
                    </div>

                    <div
                        v-if="response?.printing?.goodDealPrice"
                        class="pt-4 text-sm text-gray-600 dark:text-gray-300"
                    >
                        <div class="flex items-center gap-1">
                            <UIcon
                                name="i-lucide-tag"
                                class="text-success"
                            />
                            <span class="font-medium">Good Deal Price:</span>
                            <span class="text-success font-bold">{{ formatPrice(response.printing.goodDealPrice) }}</span>
                            <span>— listings highlighted in green are good deals!</span>
                        </div>
                    </div>

                    <template v-if="!response?.listings?.length">
                        <div class="py-8 text-center text-gray-500">
                            No listings available
                        </div>
                    </template>
                </UCard>
            </div>
        </UContainer>
    </div>
</template>

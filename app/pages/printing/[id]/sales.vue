<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const printingId = parseInt(route.params.id as string)

interface HistoryRow {
    orderDate: string
    condition: 'NEAR MINT' | 'LIGHTLY PLAYED' | 'MODERATELY PLAYED' | 'HEAVILY PLAYED' | 'DAMAGED'
    edition: 'ANY' | '1ST EDITION' | 'LIMITED' | 'UNLIMITED'
    quantity: number
    total: string
}

const { data: response, isLoading, suspense } = useQuery({
    queryKey: ['printing', 'sales', printingId],
    queryFn: async () => {
        return await $fetch(`/api/printings/sales/${printingId}`)
    },
})

const data = computed(() => {
    return response.value?.sales.flatMap(sale =>
        ({
            orderDate: formatDate(sale.orderDate),
            condition: sale.condition,
            edition: sale.edition,
            quantity: sale.quantity,
            total: formatPrice(sale.purchasePrice + sale.shippingPrice),
        }),
    )
})

const columns: TableColumn<HistoryRow>[] = [
    {
        accessorKey: 'orderDate',
        header: 'Order Date',
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
        accessorKey: 'total',
        header: 'Price',
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
                            { label: 'Sales History', to: '#' },
                        ]"
                    />

                    <h1 class="text-2xl font-bold">
                        {{ response?.card?.name }} - {{ response?.printing?.setName }} Sales History
                    </h1>

                    <div class="text-gray-500">
                        {{ response?.printing?.setCode }} · {{ response?.printing?.rarity }}
                    </div>

                    <div class="flex items-center gap-2 flex-wrap">
                        <span>Market Price: {{ formatPrice(response?.printing?.marketPrice) }}</span>
                        <span v-if="response?.printing?.goodDealPrice" class="font-medium text-success">
                            Good Deal Price: {{ formatPrice(response?.printing?.goodDealPrice) }}
                        </span>
                        <NuxtLink
                            :to="`/printing/${printingId}`"
                            class="text-primary"
                        >
                            View Listings
                        </NuxtLink>
                    </div>
                </div>

                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-semibold">
                                Recent Sales
                            </h2>
                            <UBadge>{{ response?.sales?.length || 0 }} sales</UBadge>
                        </div>
                    </template>

                    <div class="overflow-x-auto">
                        <UTable
                            :data
                            :columns
                        />
                    </div>

                    <template v-if="!response?.sales?.length">
                        <div class="py-8 text-center text-gray-500">
                            No sales history available
                        </div>
                    </template>
                </UCard>
            </div>
        </UContainer>
    </div>
</template>

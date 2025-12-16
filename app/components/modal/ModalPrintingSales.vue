<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui';

const props = defineProps<{
    printingId: number
}>()

interface HistoryRow {
    orderDate: string
    condition: 'NEAR MINT' | 'LIGHTLY PLAYED' | 'MODERATELY PLAYED' | 'HEAVILY PLAYED' | 'DAMAGED'
    edition: 'ANY' | '1ST EDITION' | 'LIMITED' | 'UNLIMITED'
    quantity: number
    total: string
}

const { data: response, isLoading } = useQuery({
    queryKey: ['printing', 'sales', props.printingId],
    queryFn: async () => {
        return await $fetch(`/api/printings/sales/${props.printingId}`)
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
</script>

<template>
    <ModalFrame
        :title="`${response?.card?.name} - ${response?.printing?.setName} Sales History`"
        width="w-[90dvw]"
    >
        <div
            v-if="isLoading"
            class="flex justify-center my-4"
        >
            <UProgress animation="swing" />
        </div>
        <div v-else-if="response">
            <!-- Card Info Header -->
            <UCard class="min-h-fit mb-4">
                <template #header>
                    <div class="flex justify-between items-center">
                        <h1 class="text-xl font-bold">
                            {{ response?.card?.name }}
                        </h1>
                        <UBadge>{{ response?.sales?.length || 0 }} sales</UBadge>
                    </div>
                </template>
                <div class="space-y-2">
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
                    </div>
                </div>
            </UCard>

            <!-- Sales History Table -->
            <UCard class="min-h-fit">
                <template #header>
                    <h2 class="text-xl font-semibold">
                        Recent Sales
                    </h2>
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
        <div
            v-else
            class="text-center p-4"
        >
            <p>No data available</p>
        </div>
    </ModalFrame>
</template>

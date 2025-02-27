<script lang="ts" setup>
const props = defineProps<{
    sellerId: number
}>()

const { data, pending, error } = await useFetch<SellerWithCards>(`/api/listings/seller/${props.sellerId}`)

function formatPrice(price: number): string {
    return price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'HIDE': return 'text-gray-400'
        case 'ENABLED': return 'text-primary'
        case 'PRIORITY': return 'text-warning'
        case 'FORCE': return 'text-danger'
        default: return ''
    }
}
</script>

<template>
    <div>
        <div
            v-if="pending"
            class="flex justify-center my-8"
        >
            <ULoadingIcon size="lg" />
        </div>
        <div
            v-else-if="error"
            class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
            <p class="text-red-700 dark:text-red-300">
                {{ error.message }}
            </p>
        </div>
        <div v-else-if="data">
            <div class="mb-4">
                <h1 class="text-2xl font-bold mb-2">
                    {{ data.seller.name }}
                </h1>
                <div class="flex gap-2 text-sm mb-4">
                    <UBadge
                        v-if="data.seller.direct"
                        color="info"
                    >
                        Direct
                    </UBadge>
                    <UBadge
                        v-if="data.seller.gold"
                        color="secondary"
                    >
                        Gold
                    </UBadge>
                    <UBadge
                        v-if="data.seller.verified"
                        color="success"
                    >
                        Verified
                    </UBadge>
                    <UBadge
                        v-if="data.seller.freeShipping"
                        color="neutral"
                    >
                        Free Shipping
                    </UBadge>
                </div>
                <div class="text-sm mb-4">
                    <span class="mr-4">Rating: {{ data.seller.rating }}/5</span>
                    <span>Sales: {{ data.seller.numberOfSales }}</span>
                </div>
                <div class="text-sm">
                    <span>Shipping: {{ formatPrice(data.seller.shipping) }}</span>
                </div>
            </div>

            <div
                v-for="card in data.cards"
                :key="card.card.id"
                class="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
                <h2 class="text-xl font-semibold mb-3">
                    {{ card.card.name }}
                </h2>

                <div
                    v-for="printing in card.printings"
                    :key="printing.printing.id"
                    class="mb-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
                >
                    <div class="flex items-center mb-2">
                        <span
                            class="font-medium mr-2"
                            :class="getPriorityColor(printing.printing.priority)"
                        >
                            {{ printing.printing.setName }} ({{ printing.printing.setCode }}) - {{ printing.printing.rarity }}
                        </span>
                        <UBadge
                            v-if="printing.printing.priority === 'HIDE'"
                            color="neutral"
                        >
                            Hidden
                        </UBadge>
                    </div>

                    <div class="text-sm mb-2">
                        <span>Market Price: {{ formatPrice(printing.printing.marketPrice) }}</span>
                        <span
                            v-if="printing.printing.maxPrice"
                            class="ml-3"
                        >
                            Max Price: {{ formatPrice(printing.printing.maxPrice) }}
                        </span>
                    </div>

                    <div class="pl-4">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b border-gray-200 dark:border-gray-700">
                                    <th class="py-2 text-left">
                                        Price
                                    </th>
                                    <th class="py-2 text-left">
                                        Quantity
                                    </th>
                                    <th class="py-2 text-left">
                                        Condition
                                    </th>
                                    <th class="py-2 text-left">
                                        Edition
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="listing in printing.listings"
                                    :key="listing.id"
                                    class="border-b border-gray-100 dark:border-gray-800"
                                >
                                    <td class="py-2">
                                        {{ formatPrice(listing.price) }}
                                    </td>
                                    <td class="py-2">
                                        {{ listing.quantity }}
                                    </td>
                                    <td class="py-2">
                                        {{ listing.condition }}
                                    </td>
                                    <td class="py-2">
                                        {{ listing.edition }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <div
            v-else
            class="text-center p-4"
        >
            <p>No data available</p>
        </div>
    </div>
</template>

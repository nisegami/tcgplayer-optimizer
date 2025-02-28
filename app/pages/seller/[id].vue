<script lang="ts" setup>
const route = useRoute()
const sellerId = parseInt(route.params.id as string, 10)

const { data, suspense: suspense, isLoading } = useQuery({
    queryKey: ['sellers', sellerId],
    queryFn: async () => {
        return await $fetch(`/api/sellers/listings/${sellerId}`)
    },
})

onServerPrefetch(suspense)
</script>

<template>
    <div class="container mx-auto p-4">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold">
                Seller Listings
            </h1>
            <UButton
                icon="i-lucide-arrow-left"
                to="/"
                variant="outline"
            >
                Back to sellers
            </UButton>
        </div>

        <div
            v-if="isLoading"
            class="flex justify-center my-4"
        >
            <UProgress animation="swing" />
        </div>
        <div v-else-if="data">
            <!-- Seller Info Card - Compact Header -->
            <UCard class="mb-4">
                <template #header>
                    <div class="flex justify-between items-center">
                        <h1 class="text-lg font-bold">
                            {{ data.seller.name }}
                        </h1>
                        <div class="flex gap-1">
                            <UBadge
                                v-if="data.seller.direct"
                                color="info"
                                size="xs"
                            >
                                Direct
                            </UBadge>
                            <UBadge
                                v-if="data.seller.gold"
                                color="secondary"
                                size="xs"
                            >
                                Gold
                            </UBadge>
                            <UBadge
                                v-if="data.seller.verified"
                                color="success"
                                size="xs"
                            >
                                Verified
                            </UBadge>
                            <UBadge
                                v-if="data.seller.freeShipping"
                                color="neutral"
                                size="xs"
                            >
                                Free Ship
                            </UBadge>
                        </div>
                    </div>
                </template>
                <div class="text-xs grid grid-cols-2 gap-1">
                    <div>Rating: {{ data.seller.rating }}/5</div>
                    <div>Sales: {{ data.seller.numberOfSales }}</div>
                    <div>Shipping: {{ formatPrice(data.seller.shipping) }}</div>
                </div>
            </UCard>

            <!-- Card Accordion Groups -->
            <UAccordion
                :items="data.cards.map(card => ({
                    label: card.card.name,
                    slot: 'card-' + card.card.id,
                    defaultOpen: true,
                }))"
            >
                <template
                    v-for="card in data.cards"
                    :key="card.card.id"
                    #[`card-${card.card.id}`]
                >
                    <!-- Printings (non-collapsible) -->
                    <div
                        v-for="printing in card.printings"
                        :key="printing.printing.id"
                        class="mb-4 border-l-2 border-gray-200 dark:border-gray-700 pl-2"
                    >
                        <!-- Printing header -->
                        <div class="flex items-center mb-2">
                            <span
                                v-if="printing.printing.priority === 'HIDE'"
                                class="i-lucide-eye-off mr-1 text-gray-400"
                            />
                            <span
                                v-else
                                class="i-lucide-box mr-1"
                                :class="getPriorityColor(printing.printing.priority)"
                            />
                            <a
                                :href="`https://www.tcgplayer.com/product/${printing.printing.itemNo}`"
                                target="_blank"
                                class="font-medium mr-2 text-sm hover:underline flex items-center"
                                :class="getPriorityColor(printing.printing.priority)"
                            >
                                {{ printing.printing.setCode }} - {{ printing.printing.rarity }}
                                <span class="i-lucide-external-link ml-1 text-xs" />
                            </a>
                            <UBadge
                                v-if="printing.printing.priority === 'HIDE'"
                                color="neutral"
                                size="xs"
                            >
                                Hidden
                            </UBadge>

                            <span class="ml-auto text-xs">
                                <span class="mr-2">Market: {{ formatPrice(printing.printing.marketPrice) }}</span>
                                <span v-if="printing.printing.maxPrice">Max: {{ formatPrice(printing.printing.maxPrice) }}</span>
                            </span>
                        </div>

                        <!-- Mobile-friendly Listing Cards -->
                        <div class="md:hidden space-y-2 pl-2">
                            <UCard
                                v-for="listing in printing.listings"
                                :key="listing.id"
                                class="border border-gray-100 dark:border-gray-800 p-2"
                            >
                                <div class="grid grid-cols-2 gap-1 text-xs">
                                    <div class="font-semibold">
                                        Price:
                                    </div>
                                    <div>{{ formatPrice(listing.price) }}</div>
                                    <div class="font-semibold">
                                        Quantity:
                                    </div>
                                    <div>{{ listing.quantity }}</div>
                                    <div class="font-semibold">
                                        Condition:
                                    </div>
                                    <div>{{ listing.condition }}</div>
                                    <div class="font-semibold">
                                        Edition:
                                    </div>
                                    <div>{{ listing.edition }}</div>
                                </div>
                            </UCard>
                        </div>

                        <!-- Desktop Table View -->
                        <div class="hidden md:block pl-2">
                            <table class="w-full text-xs">
                                <thead>
                                    <tr class="border-b border-gray-200 dark:border-gray-700">
                                        <th class="py-1 text-left">
                                            Price
                                        </th>
                                        <th class="py-1 text-left">
                                            Qty
                                        </th>
                                        <th class="py-1 text-left">
                                            Condition
                                        </th>
                                        <th class="py-1 text-left">
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
                                        <td class="py-1">
                                            {{ formatPrice(listing.price) }}
                                        </td>
                                        <td class="py-1">
                                            {{ listing.quantity }}
                                        </td>
                                        <td class="py-1">
                                            {{ listing.condition }}
                                        </td>
                                        <td class="py-1">
                                            {{ listing.edition }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </template>
            </UAccordion>
        </div>
        <div
            v-else
            class="text-center p-4"
        >
            <p>No data available</p>
        </div>
    </div>
</template>

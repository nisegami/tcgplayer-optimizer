<script setup lang="ts">
const { data: cardData, isLoading: cardsLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
        return await $fetch('/api/cards') as { card: Card, printings: Printing[] }[]
    },
})

const { data: sellerData, isLoading: sellersLoading, dataUpdatedAt: sellersUpdatedAt } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
        return await $fetch('/api/sellers') as SellerWithCards[]
    },
})

const activeView = ref<'cards' | 'sellers'>('cards')
function toggleView(view: 'cards' | 'sellers') {
    activeView.value = view
}

const isMobile = ref(false)

onMounted(() => {
    const checkMobile = () => {
        isMobile.value = window.innerWidth < 768
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    onUnmounted(() => {
        window.removeEventListener('resize', checkMobile)
    })
})
</script>

<template>
    <div class="flex flex-col md:flex-row h-screen w-screen overflow-hidden">
        <div
            class="w-full md:w-1/3 overflow-y-auto overflow-x-none flex flex-col gap-5 p-5 pb-32 md:pb-5"
            :class="{ hidden: isMobile && activeView !== 'cards' }"
        >
            <div class="hidden md:block">
                <ControlBar />
            </div>

            <!-- Cards Loading State -->
            <div
                v-if="cardsLoading"
                class="space-y-5"
            >
                <div
                    v-for="i in 3"
                    :key="i"
                    class="space-y-3"
                >
                    <USkeleton class="h-6 w-3/4" />
                    <USkeleton class="h-4 w-full" />
                    <USkeleton class="h-4 w-2/3" />
                    <div class="space-y-2">
                        <USkeleton class="h-3 w-1/2" />
                        <USkeleton class="h-3 w-3/4" />
                    </div>
                </div>
            </div>

            <!-- Cards Content -->
            <CardDetails
                v-for="{ card, printings } of cardData"
                :key="card.id"
                :card="card"
                :printings="printings as Printing[]"
            />
        </div>

        <!-- Sellers Loading State -->
        <div
            v-if="sellersLoading"
            class="grow w-full md:w-2/3 overflow-y-auto overflow-x-none flex flex-col gap-5 p-5 pb-32 md:pb-5"
            :class="{ hidden: isMobile && activeView !== 'sellers' }"
        >
            <div
                v-for="i in 4"
                :key="i"
                class="space-y-4"
            >
                <div class="flex items-center gap-3">
                    <USkeleton class="h-8 w-8 rounded-full" />
                    <USkeleton class="h-5 w-32" />
                </div>
                <div class="space-y-3">
                    <div
                        v-for="j in 2"
                        :key="j"
                        class="flex gap-3"
                    >
                        <USkeleton class="h-16 w-16 rounded" />
                        <div class="flex-1 space-y-2">
                            <USkeleton class="h-4 w-3/4" />
                            <USkeleton class="h-3 w-1/2" />
                            <USkeleton class="h-3 w-1/4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Sellers Content -->
        <div
            v-else-if="!sellersLoading"
            :key="sellersUpdatedAt"
            class="grow w-full md:w-2/3 overflow-y-auto overflow-x-none flex flex-col gap-5 p-5 pb-32 md:pb-5"
            :class="{ hidden: isMobile && activeView !== 'sellers' }"
        >
            <SellerWithListings
                v-for="{ seller, cards } of sellerData"
                :key="seller.id"
                :seller="seller"
                :cards="cards as {
                    card: Card
                    printings: {
                        printing: Printing
                        listings: Listing[]
                    }[]
                }[]"
            />
        </div>

        <div
            class="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg transition-colors duration-300"
        >
            <div
                class="px-4 py-2"
                :class="{ hidden: activeView !== 'cards' }"
            >
                <ControlBar />
            </div>

            <div class="w-full flex">
                <button
                    class="flex-1 py-4 text-center font-medium transition-colors duration-300"
                    :class="activeView === 'cards'
                        ? 'text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400'"
                    @click="toggleView('cards')"
                >
                    Cards
                </button>
                <button
                    class="flex-1 py-4 text-center font-medium transition-colors duration-300"
                    :class="activeView === 'sellers'
                        ? 'text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400'"
                    @click="toggleView('sellers')"
                >
                    Sellers
                </button>
            </div>
        </div>
    </div>
</template>

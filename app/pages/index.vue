<script setup lang="ts">
const { data: cardData, suspense: cardSuspense } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
        return await $fetch('/api/cards') as { card: Card, printings: Printing[] }[]
    },
})

const { data: sellerData, suspense: sellerSuspense, isLoading: sellersLoading, dataUpdatedAt: sellersUpdatedAt } = useQuery({
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

onServerPrefetch(cardSuspense)
onServerPrefetch(sellerSuspense)
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
            <CardDetails
                v-for="{ card, printings } of cardData"
                :key="card.id"
                :card="card"
                :printings="printings as Printing[]"
            />
        </div>

        <div
            v-if="!sellersLoading"
            :key="sellersUpdatedAt"
            class="flex-grow w-full md:w-2/3 overflow-y-auto overflow-x-none flex flex-col gap-5 p-5 pb-32 md:pb-5"
            :class="{ hidden: isMobile && activeView !== 'sellers' }"
        >
            <SellerWithListings
                v-for="{ seller, cards } of sellerData"
                :key="seller.id"
                :seller="seller"
                :cards="cards as CardWithPrintings[]"
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

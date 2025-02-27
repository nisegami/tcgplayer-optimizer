<script lang="ts" setup>
const route = useRoute()
const sellerId = parseInt(route.params.id as string, 10)

useHead({
    title: 'Seller Listings',
})
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

        <SellerListingsDetail :seller-id="sellerId" />
    </div>
</template>

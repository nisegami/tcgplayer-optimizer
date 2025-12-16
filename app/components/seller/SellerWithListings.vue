<script lang="ts" setup>
import { ModalSellerDetails } from '#components';
import type { TableColumn } from '@nuxt/ui';

const props = defineProps<{
    seller: Seller
    cards: {
        card: Card
        printings: {
            printing: Printing
            listings: Listing[]
        }[]
    }[]
}>()

const modals = useModals()

function openSellerDetailsModal() {
    modals.open(ModalSellerDetails, {
        props: {
            sellerId: props.seller.id,
            sellerKey: props.seller.key,
        },
    })
}

async function openOnTCGPlayer() {
    return await navigateTo(`https://shop.tcgplayer.com/sellerfeedback/${props.seller.key}`, { external: true, open: { target: '_blank' } })
}

interface ListingRow {
    cardName: string
    setCode: string
    rarity: string
    edition: 'ANY' | '1ST EDITION' | 'LIMITED' | 'UNLIMITED'
    condition: 'NEAR MINT' | 'LIGHTLY PLAYED' | 'MODERATELY PLAYED' | 'HEAVILY PLAYED' | 'DAMAGED'
    quantity: number
    price: number
}

const data = computed(() => {
    return props.cards.flatMap(card =>
        card.printings.flatMap(printing =>
            printing.listings.map(listing => ({
                cardName: card.card.name,
                setCode: printing.printing.setCode,
                rarity: printing.printing.rarity,
                edition: listing.edition,
                condition: listing.condition,
                quantity: listing.quantity,
                price: listing.price,
            })),
        ),
    )
})

const columns: TableColumn<ListingRow>[] = [
    {
        accessorKey: 'cardName',
        header: 'Card',
    },
    {
        accessorKey: 'setCode',
        header: 'Printing',
    },
    {
        accessorKey: 'rarity',
        header: 'Rarity',
    },
    {
        accessorKey: 'edition',
        header: 'Edition',
    },
    {
        accessorKey: 'condition',
        header: 'Condition',
    },
    {
        accessorKey: 'quantity',
        header: 'Quantity',
    },
    {
        accessorKey: 'price',
        header: 'Price',
    },
]
</script>

<template>
    <UCard class="min-h-fit">
        <template #header>
            <div class="flex flex-row justify-center w-full items-center space-x-5">
                <div>{{ seller.name }}</div>
                <div class="flex space-x-2">
                    <UButton
                        icon="i-lucide-list"
                        variant="outline"
                        color="primary"
                        class="shrink-0"
                        title="View all listings including hidden ones"
                        @click="openSellerDetailsModal()"
                    />
                    <UButton
                        icon="i-lucide-external-link"
                        variant="outline"
                        class="shrink-0"
                        title="Open seller on TCGPlayer"
                        @click="openOnTCGPlayer()"
                    />
                </div>
            </div>
        </template>
        <UTable
            :data
            :columns
        />
    </UCard>
</template>

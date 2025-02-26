<script lang="ts" setup>
defineProps<{
    card: Card
    printings: Printing[]
}>()
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex flex-row justify-center w-full">
                {{ card.name }}
            </div>
        </template>
        <div class="flex flex-col space-y-5">
            <template
                v-for="printing of printings"
                :key="printing.id"
            >
                <CardPrinting :printing />
            </template>
        </div>
    </UCard>
</template>

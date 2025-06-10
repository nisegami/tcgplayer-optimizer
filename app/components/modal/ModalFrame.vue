<script lang="ts" setup>
const props = withDefaults(
    defineProps<{
        title: string
        width?: string
        height?: string
        onClose?: () => void
    }>(),
    {
        width: 'w-[90dvw] xl:w-auto',
        height: 'max-h-[90dvh]',
    },
)

const { close } = useModal()

function handleClose() {
    if (props.onClose) {
        props.onClose()
    }
    close()
}
</script>

<template>
    <div
        class="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-xl relative m-auto"
        :class="[props.width, props.height]"
    >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 class="text-lg font-semibold truncate">
                {{ props.title }}
            </h2>
            <button
                type="button"
                class="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
                @click="handleClose"
            >
                <UIcon
                    name="i-heroicons-x-mark-20-solid"
                    class="w-6 h-6"
                />
            </button>
        </div>
        <!-- Body -->
        <div class="p-6 overflow-auto flex-1">
            <slot />
        </div>
    </div>
</template>

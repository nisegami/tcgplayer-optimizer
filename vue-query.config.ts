export default defineVueQueryPluginHook(({ queryClient }) => {
    queryClient.setDefaultOptions({
        queries: {
            staleTime: 10 * 1000, // 30 seconds
        },
    })
    return {
        pluginReturn: { provide: { queryClient } },
    }
})

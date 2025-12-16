// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

    modules: [
        '@nuxt/ui',
        '@nuxt/eslint',
        '@peterbud/nuxt-query',
        '@outloud/nuxt-modals',
    ],

    ssr: false,

    devtools: { enabled: true },

    css: ['~/assets/css/main.css'],

    compatibilityDate: '2025-12-16',

    vite: {
        server: {
            allowedHosts: ['cart.arshad.lol'],
        },
    },

    eslint: {
        config: {
            stylistic: {
                indent: 4,
                quotes: 'single',
                semi: false,
            },
        },
    },

    nuxtQuery: {
        autoImports: ['useQuery', 'useMutation', 'useQueryClient'],
        devtools: true,
        queryClientOptions: {
            defaultOptions: {
                queries: {
                    staleTime: 30 * 1000, // 30 seconds
                },
            },
        },
    },
})

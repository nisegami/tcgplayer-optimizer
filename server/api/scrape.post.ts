import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        productId: z.coerce.number(),
        listingCount: z.coerce.number().optional().default(50),
        salesCount: z.coerce.number().optional().default(100),
        includeListings: z.boolean().optional().default(true),
        includeSales: z.boolean().optional().default(true),
    })

    const params = await readValidatedBody(event, schema.parseAsync)
    const scraper = useScraper()

    if (params.includeListings && params.includeSales) {
        return await scraper.scrapeAll(
            params.productId,
            params.listingCount ?? 50,
            params.salesCount ?? 100,
        )
    }
    else if (params.includeListings) {
        return await scraper.scrapeListing(params.productId, params.listingCount)
    }
    else if (params.includeSales) {
        return await scraper.scrapeSalesHistory(params.productId, params.salesCount)
    }
    else {
        throw createError({
            statusCode: 400,
            message: 'At least one of includeListings or includeSales must be true',
        })
    }
})

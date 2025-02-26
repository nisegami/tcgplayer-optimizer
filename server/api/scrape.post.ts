import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        productId: z.coerce.number(),
        count: z.coerce.number().optional(),
    })
    const params = await readValidatedBody(event, schema.parseAsync)
    const scraper = useScraper()
    return await scraper.scrapeListing(params.productId, params.count ?? 50)
})

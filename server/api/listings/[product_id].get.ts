import { eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        product_id: z.coerce.number(),
    })
    const params = await getValidatedRouterParams(event, schema.parseAsync)
    const drizzle = useDrizzle()
    const printing = await drizzle.select().from(printings).where(eq(printings.itemNo, params.product_id)).then(takeUniqueOrThrow)
    return await drizzle.select().from(listings).where(eq(listings.printingId, printing.id)).innerJoin(sellers, eq(listings.sellerId, sellers.id))
})

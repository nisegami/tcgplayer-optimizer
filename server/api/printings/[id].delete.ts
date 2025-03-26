import { eq } from 'drizzle-orm'

import { count } from 'drizzle-orm/sql/functions/aggregate'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        id: z.coerce.number(),
    })
    const params = await getValidatedRouterParams(event, schema.parseAsync)
    const drizzle = useDrizzle()
    await drizzle.delete(listings).where(eq(listings.printingId, params.id))
    await drizzle.delete(salesHistory).where(eq(salesHistory.printingId, params.id))
    const deletedPrintings = await drizzle.delete(printings).where(eq(printings.id, params.id)).returning()
    if (deletedPrintings.length) {
        const cardId = deletedPrintings[0].cardId
        const [{ value: hasOtherPrintings }] = await drizzle.select({ value: count() }).from(printings).where(eq(printings.cardId, cardId))
        if (!hasOtherPrintings) {
            await drizzle.delete(cards).where(eq(cards.id, cardId))
        }
    }
})

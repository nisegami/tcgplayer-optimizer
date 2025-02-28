import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        id: z.coerce.number(),
    })
    const params = await getValidatedRouterParams(event, schema.parseAsync)

    const db = useDrizzle()

    // Check if the printing exists
    const [printing] = await db.select()
        .from(printings)
        .leftJoin(cards, eq(printings.cardId, cards.id))
        .where(eq(printings.id, params.id))

    if (!printing) {
        throw createError({
            statusCode: 404,
            message: 'Printing not found',
        })
    }

    // Get the sales history for this printing
    const sales = await db.select()
        .from(salesHistory)
        .where(eq(salesHistory.printingId, params.id))
        .orderBy(desc(salesHistory.orderDate))

    return {
        printing: printing.printings,
        card: printing.cards,
        sales,
    }
})

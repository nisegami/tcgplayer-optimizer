import { eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        id: z.coerce.number(),
    })
    const params = await getValidatedRouterParams(event, schema.parseAsync)
    const db = useDrizzle()

    // Check if id is a printing id or a TCGPlayer item number
    let printingId = params.id
    let isPrintingId = true

    try {
        // First try to get printing by id
        const [printing] = await db.select()
            .from(printings)
            .where(eq(printings.id, printingId))

        if (!printing) {
            // If not found by id, try to get by item number
            isPrintingId = false
            const [printingByItemNo] = await db.select()
                .from(printings)
                .where(eq(printings.itemNo, printingId))

            if (printingByItemNo) {
                printingId = printingByItemNo.id
            }
            else {
                throw createError({
                    statusCode: 404,
                    message: 'Printing not found',
                })
            }
        }
    }
    catch (error) {
        if (!isPrintingId) {
            // Try to get by item number if id lookup failed
            const [printingByItemNo] = await db.select()
                .from(printings)
                .where(eq(printings.itemNo, printingId))

            if (printingByItemNo) {
                printingId = printingByItemNo.id
            }
            else {
                throw createError({
                    statusCode: 404,
                    message: 'Printing not found',
                })
            }
        }
        else {
            throw error
        }
    }

    // Get the printing with card information
    const [printing] = await db.select()
        .from(printings)
        .leftJoin(cards, eq(printings.cardId, cards.id))
        .where(eq(printings.id, printingId))

    // Get the listings for this printing
    const listingsWithSellers = await db.select({
        id: listings.id,
        price: listings.price,
        quantity: listings.quantity,
        directQuantity: listings.directQuantity,
        condition: listings.condition,
        edition: listings.edition,
        seller: {
            id: sellers.id,
            name: sellers.name,
            shipping: sellers.shipping,
            rating: sellers.rating,
            numberOfSales: sellers.numberOfSales,
            freeShipping: sellers.freeShipping,
            gold: sellers.gold,
            direct: sellers.direct,
            verified: sellers.verified,
        },
    })
        .from(listings)
        .leftJoin(sellers, eq(listings.sellerId, sellers.id))
        .where(eq(listings.printingId, printingId))
        .orderBy(listings.price)

    return {
        printing: printing.printings,
        card: printing.cards,
        listings: listingsWithSellers,
    }
})

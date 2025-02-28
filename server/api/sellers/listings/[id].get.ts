import { and, eq, not } from 'drizzle-orm'
import { z } from 'zod'

type ListingsAccumulator = Record<number, {
    card: Card
    printings: Record<number, {
        printing: Printing
        listings: Listing[]
    }>
}>

export default defineEventHandler(async (event) => {
    const schema = z.object({
        id: z.coerce.number(),
    })
    const params = await getValidatedRouterParams(event, schema.parseAsync)

    const db = useDrizzle()

    const rows = await db
        .select({
            seller: sellers,
            listing: listings,
            printing: printings,
            card: cards,
        })
        .from(sellers)
        .innerJoin(listings, eq(listings.sellerId, sellers.id))
        .innerJoin(printings, eq(printings.id, listings.printingId))
        .innerJoin(cards, eq(cards.id, printings.cardId))
        .where(
            and(
                eq(sellers.id, params.id),
                not(eq(printings.priority, 'DISABLED')),
            ),
        )

    if (rows.length === 0)
        throw createError({ statusCode: 404, message: 'Seller not found or has no applicable listings' })

    // Group listings by cards and printings
    const seller = rows[0].seller

    const listingsByCardAndPrinting = rows.reduce((acc, row) => {
        const cardId = row.card.id
        const printingId = row.printing.id

        if (!acc[cardId]) {
            acc[cardId] = {
                card: row.card,
                printings: {},
            }
        }

        if (!acc[cardId].printings[printingId]) {
            acc[cardId].printings[printingId] = {
                printing: row.printing,
                listings: [],
            }
        }

        acc[cardId].printings[printingId].listings.push(row.listing)

        return acc
    }, {} as ListingsAccumulator)

    // Convert to array format
    const formattedResult = {
        seller,
        cards: Object.values(listingsByCardAndPrinting).map(cardEntry => ({
            card: cardEntry.card,
            printings: Object.values(cardEntry.printings).map(printingEntry => ({
                printing: printingEntry.printing,
                listings: printingEntry.listings,
            })),
        })),
    }

    return formattedResult
})

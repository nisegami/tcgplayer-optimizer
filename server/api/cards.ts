import { eq } from 'drizzle-orm'

function sortCards({ card: a }: { card: Card }, { card: b }: { card: Card }) {
    const nameA = a.name.toUpperCase()
    const nameB = b.name.toUpperCase()

    if (nameA < nameB)
        return -1

    if (nameA > nameB)
        return 1

    return 0
}

export default defineEventHandler(async () => {
    const drizzle = useDrizzle()
    const rows = await drizzle
        .select({
            card: cards,
            printing: printings,
        })
        .from(cards)
        .leftJoin(printings, eq(cards.id, printings.cardId))

    const reduced = rows.reduce<Record<number, { card: Card, printings: Printing[] }>>(
        (acc, row) => {
            const card = row.card
            const printing = row.printing
            if (!acc[card.id])
                acc[card.id] = { card, printings: [] }

            if (printing)
                acc[card.id].printings.push(printing)

            return acc
        },
        {},
    )

    return Object.values(reduced).sort(sortCards)
})

import { eq, inArray } from 'drizzle-orm'

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
        .where(inArray(printings.priority, ['ENABLED', 'HIDE']))

    const reduced = rows.reduce<Record<number, { card: Card, printings: Printing[] }>>(
        (acc, row) => {
            const card = row.card
            const printing = row.printing
            if (!card) return acc

            const cardId = card.id
            if (!acc[cardId]) {
                acc[cardId] = { card, printings: [] }
            }

            if (printing) {
                const cardData = acc[cardId]
                if (cardData) {
                    cardData.printings.push(printing)
                }
            }

            return acc
        },
        {},
    )

    return Object.values(reduced).sort(sortCards)
})

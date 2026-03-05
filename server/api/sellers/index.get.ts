import { eq, not } from 'drizzle-orm'

function scoreListings(printing: Printing, listings: Listing[]): number {
    if (printing.priority === 'HIDE' || printing.priority === 'DISABLED')
        return 0
    return Math.min(listings.reduce((acc, listing) => acc + listing.quantity, 0), printing.desiredQuantity)
}

function scorePrintings(printings: PrintingWithListings[]) {
    return Math.min(...printings.map(p => scoreListings(p.printing, p.listings)))
}

function scoreSeller(s: SellerWithCards) {
    return s.cards.reduce((acc, card) => acc + scorePrintings(card.printings), 0)
}

function sortSellers(a: SellerWithCards, b: SellerWithCards) {
    const countA = scoreSeller(a)
    const countB = scoreSeller(b)

    if (countA < countB)
        return -1

    if (countA > countB)
        return 1

    return 0
}

function conditionTest(listingCondition: Condition, desiredCondition: Condition): boolean {
    const left = conditionEnum.enumValues.indexOf(listingCondition)
    const right = conditionEnum.enumValues.indexOf(desiredCondition)
    return left <= right
}

function editionTest(listingEdition: Edition, desiredEdition: Edition): boolean {
    return (desiredEdition === 'ANY') || (desiredEdition === listingEdition)
}

function test(printing: Printing, listing: Listing): boolean {
    if (printing.priority === 'FORCE')
        return true

    if (printing.priority === 'DISABLED' || printing.priority === 'HIDE')
        return false

    if (printing.maxPrice && listing.price > printing.maxPrice)
        return false

    if (!conditionTest(listing.condition, printing.desiredCondition))
        return false

    if (!editionTest(listing.edition, printing.desiredEdition))
        return false

    if (printing.priority !== 'PRIORITY' && printing.desiredQuantity > listing.quantity)
        return false

    return true
}

export default defineEventHandler(async () => {
    const drizzle = useDrizzle()

    const rows = await drizzle
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
        .where(not(sellers.blocked))

    const reduced = rows.reduce<SellerRecord>(
        (acc, row) => {
            const seller = row.seller
            const listing = row.listing
            const printing = row.printing
            const card = row.card

            if (!seller || !listing || !printing || !card) return acc

            const sellerId = seller.id
            const cardId = card.id
            const printingId = printing.id
            const listingId = listing.id

            if (!acc[sellerId]) {
                acc[sellerId] = {
                    seller,
                    cards: {},
                }
            }

            const sellerData = acc[sellerId]
            if (!sellerData) return acc

            if (!sellerData.cards[cardId]) {
                sellerData.cards[cardId] = {
                    card,
                    printings: {},
                }
            }

            const cardData = sellerData.cards[cardId]
            if (!cardData) return acc

            if (!cardData.printings[printingId]) {
                cardData.printings[printingId] = {
                    printing,
                    listings: {},
                }
            }

            const printingData = cardData.printings[printingId]
            if (!printingData) return acc

            if (!printingData.listings[listingId]) {
                printingData.listings[listingId] = listing
            }

            return acc
        },
        {},
    )

    const result: SellerWithCards[] = Object.values(reduced).map(sellerRecord => ({
        seller: sellerRecord.seller,
        cards: Object.values(sellerRecord.cards).map(cardRecord => ({
            card: cardRecord.card,
            printings: Object.values(cardRecord.printings).map(printingRecord => ({
                printing: printingRecord.printing,
                listings: Object.values(printingRecord.listings),
            })),
        })),
    }))

    const cleaned = result.map(seller => ({
        ...seller,
        cards: seller.cards
            .map(card => ({
                ...card,
                printings: card.printings
                    .map(printing => ({
                        ...printing,
                        listings: printing.listings.filter(listing => test(printing.printing, listing)),
                    }))
                    .filter(printing => printing.listings.length > 0),
            }))
            .filter(card => card.printings.length > 0),
    })).filter(seller => seller.cards.length > 0)

    const trimmed = cleaned.filter(s => scoreSeller(s) > 1)

    return trimmed.sort(sortSellers).reverse()
})

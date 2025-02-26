import { eq } from 'drizzle-orm'
import { z } from 'zod'

const drizzle = useDrizzle()

const tcgplayerListingSchema = z.object({
    directProduct: z.boolean(),
    goldSeller: z.boolean(),
    listingId: z.number(),
    channelId: z.number(),
    conditionId: z.number(),
    verifiedSeller: z.boolean(),
    directInventory: z.number(),
    rankedShippingPrice: z.number(),
    productId: z.number(),
    printing: z.string().toUpperCase().pipe(z.enum(editionEnum.enumValues)),
    languageAbbreviation: z.string(),
    sellerName: z.string(),
    forwardFreight: z.boolean(),
    sellerShippingPrice: z.number(),
    language: z.string(),
    shippingPrice: z.number(),
    condition: z.string().toUpperCase().pipe(z.enum(conditionEnum.enumValues)),
    languageId: z.number(),
    score: z.number(),
    directSeller: z.boolean(),
    productConditionId: z.number(),
    sellerId: z.string(),
    listingType: z.string(),
    sellerRating: z.number(),
    sellerSales: z.string(),
    quantity: z.number(),
    sellerKey: z.string(),
    price: z.number(),
})

const tcgplayerListingResponseSchema = z.object({
    results: z.array(z.object({
        results: z.array(tcgplayerListingSchema),
    })),
})

const customAttributesSchema = z.object({
    description: z.string(),
    number: z.string(),
    cardTypeB: z.string(),

    attribute: z.array(z.string()).nullish(),
    detailNote: z.string().nullish(),
    releaseDate: z.string().datetime().nullish(),
    cardType: z.array(z.string()).nullish(),
    monsterType: z.array(z.string()).nullish(),
    rarityDbName: z.string().nullish(),
    level: z.string().nullish(),
    defense: z.string().nullish(),
    linkArrows: z.array(z.string()).nullish(),
    flavorText: z.string().nullish(),
    attack: z.string().nullish(),
    linkRating: z.string().nullish(),
})

const tcgplayerListingDetailSchema = z.object({
    customListings: z.number(),
    shippingCategoryId: z.number(),
    duplicate: z.boolean(),
    productLineUrlName: z.string(),
    productTypeName: z.string(),
    productUrlName: z.string(),
    productTypeId: z.number(),
    rarityName: z.string(),
    sealed: z.boolean(),
    marketPrice: z.number(),
    customAttributes: customAttributesSchema,
    lowestPriceWithShipping: z.number(),
    productName: z.string(),
    setId: z.number(),
    setCode: z.string(),
    productId: z.number(),
    imageCount: z.number(),
    score: z.number(),
    setName: z.string(),
    sellers: z.number(),
    foilOnly: z.boolean(),
    setUrlName: z.string(),
    sellerListable: z.boolean(),
    productLineId: z.number(),
    productStatusId: z.number(),
    productLineName: z.string(),
    maxFulfillableQuantity: z.number(),
    normalOnly: z.boolean(),
    listings: z.number(),
    lowestPrice: z.number(),
    medianPrice: z.number().nullish(),
})

type TCGPlayerListing = z.infer<typeof tcgplayerListingSchema>
type TCGPlayerDetails = z.infer<typeof tcgplayerListingDetailSchema>

async function getTCGPlayerListingsForProduct(productId: number, quantity: number) {
    const url = `https://mp-search-api.tcgplayer.com/v1/product/${productId}/listings?mpfev=2144`

    const body = {
        filters: {
            term: {
                sellerStatus: 'Live',
                channelId: 0,
                language: [
                    'English',
                ],
                listingType: 'standard',
            },
            range: {
                quantity: {
                    gte: 1,
                },
            },
            exclude: {
                channelExclusion: 0,
            },
        },
        from: 0,
        size: quantity,
        sort: {
            field: 'price+shipping',
            order: 'asc',
        },
        context: {
            shippingCountry: 'US',
            cart: {},
        },
    }

    const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }

    const response = await fetch(url, options)
    const data = await response.json()
    const result = await tcgplayerListingResponseSchema.parseAsync(data)
    const listings = result.results[0].results
    return listings
}

async function getTCGPlayerListingDetailsForProduct(productId: number) {
    const url = `https://mp-search-api.tcgplayer.com/v1/product/${productId}/details?mpfev=2407`

    const options = {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
    }

    const response = await fetch(url, options)
    const data = await response.json()
    const result = await tcgplayerListingDetailSchema.parseAsync(data)
    return result
}

async function getAndUpdateSellerMap(listings: TCGPlayerListing[]) {
    const sellerRecords = await drizzle.select().from(sellers)

    const sellerMap: Record<string, Seller> = {}

    for (const seller of sellerRecords)
        sellerMap[seller.key] = seller

    for (const listing of listings) {
        const sellerKey = listing.sellerKey

        if (sellerMap[sellerKey]) {
            if (sellerMap[sellerKey].shipping !== listing.shippingPrice || sellerMap[sellerKey].name !== listing.sellerName) {
                sellerMap[sellerKey].name = listing.sellerName
                sellerMap[sellerKey].shipping = listing.shippingPrice
                await drizzle.update(sellers)
                    .set({ name: listing.sellerName, shipping: listing.shippingPrice, freeShipping: !listing.sellerShippingPrice })
                    .where(eq(sellers.id, sellerMap[sellerKey].id))
                    .returning()
            }
        }
        else {
            const newSeller = {
                name: listing.sellerName,
                key: listing.sellerKey,
                shipping: listing.shippingPrice,
                rating: listing.sellerRating,
                numberOfSales: listing.sellerSales,
                freeShipping: !listing.sellerShippingPrice,
                gold: listing.goldSeller,
                direct: listing.directSeller,
                verified: listing.verifiedSeller,
            }

            const [result] = await drizzle.insert(sellers).values(newSeller).returning()
            sellerMap[sellerKey] = result
        }
    }

    return sellerMap
}

async function getOrInsertCard(details: TCGPlayerDetails) {
    const [cardName] = details.productName.split(' (')

    const [existingCard] = await drizzle
        .select()
        .from(cards)
        .where(eq(cards.name, cardName))

    if (existingCard) {
        return existingCard
    }
    else {
        const [newCard] = await drizzle
            .insert(cards)
            .values({
                name: cardName,
            })
            .returning()

        return newCard
    }
}

async function getOrInsertPrinting(card: Card, details: TCGPlayerDetails) {
    const itemNo = details.productId

    const [existingPrinting] = await drizzle
        .select()
        .from(printings)
        .where(eq(printings.itemNo, itemNo))

    if (existingPrinting) {
        return existingPrinting
    }
    else {
        const setName = details.setName
        const setCode = details.customAttributes.number
        const rarity = details.rarityName
        const marketPrice = details.marketPrice
        const cardId = card.id

        const [newPrinting] = await drizzle
            .insert(printings)
            .values({
                itemNo,
                setName,
                setCode,
                rarity,
                marketPrice,
                cardId,
            })
            .returning()

        return newPrinting
    }
}

async function clearListingsForPrinting(printing: Printing) {
    await drizzle.delete(listings).where(eq(listings.printingId, printing.id))
}

async function storeListingsForPrinting(productListings: TCGPlayerListing[], sellerMap: Record<string, Seller>, printing: Printing) {
    const newListings: ListingInsert[] = []

    for (const productListing of productListings) {
        const price = productListing.price
        const quantity = productListing.quantity
        const directQuantity = productListing.directInventory
        const condition = productListing.condition
        const edition = productListing.printing
        const printingId = printing.id
        const sellerId = sellerMap[productListing.sellerKey].id

        const newListing = {
            price,
            quantity,
            directQuantity,
            condition,
            edition,
            printingId,
            sellerId,
        }

        newListings.push(newListing)
    }

    const insertedListings = await drizzle.insert(listings).values(newListings).returning()

    await drizzle.update(printings)
        .set({
            lastScraped: new Date(),
        })
        .where(eq(printings.id, printing.id))

    return insertedListings
}

export function useScraper() {
    async function scrapeListing(productId: number, quantity: number | undefined) {
        const productDetails = await getTCGPlayerListingDetailsForProduct(productId)
        const productListings = await getTCGPlayerListingsForProduct(productId, quantity ?? 50)

        const sellerMap = await getAndUpdateSellerMap(productListings)
        const card = await getOrInsertCard(productDetails)
        const printing = await getOrInsertPrinting(card, productDetails)

        await clearListingsForPrinting(printing)
        const insertedListings = await storeListingsForPrinting(productListings, sellerMap, printing)

        const response = {
            cardName: card.name,
            setCode: printing.setCode,
            rarity: printing.rarity,
            numberOfListings: insertedListings.length,
        }

        return response
    }
    return { scrapeListing }
}

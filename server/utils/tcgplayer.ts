import { parseJSON } from 'date-fns'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { cards, listings, printings, salesHistory, sellers, conditionEnum } from '../../shared/utils/schema'

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 250 // 250ms between requests

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function throttledFetch(url: string, options: RequestInit): Promise<Response> {
    const now = Date.now()
    const timeElapsed = now - lastRequestTime

    if (timeElapsed < MIN_REQUEST_INTERVAL) {
        const delay = MIN_REQUEST_INTERVAL - timeElapsed
        await sleep(delay)
    }

    lastRequestTime = Date.now()
    return fetch(url, options)
}

type TCGPlayerListing = z.infer<typeof tcgplayerListingSchema>
type TCGPlayerDetails = z.infer<typeof tcgplayerListingDetailSchema>
type TCGPlayerSaleHistory = z.infer<typeof tcgplayerSaleHistorySchema>

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

const tcgplayerSaleHistorySchema = z.object({
    condition: z.string(),
    variant: z.string(),
    language: z.string(),
    quantity: z.number(),
    title: z.string(),
    listingType: z.string(),
    customListingId: z.string(),
    purchasePrice: z.number(),
    shippingPrice: z.number(),
    orderDate: z.string(),
})

const tcgplayerSaleHistoryResponseSchema = z.object({
    previousPage: z.string(),
    nextPage: z.string().optional(),
    resultCount: z.number(),
    totalResults: z.number(),
    data: z.array(tcgplayerSaleHistorySchema),
})

const customAttributesSchema = z.object({
    description: z.string(),
    number: z.string(),
    cardTypeB: z.string().nullable().default('Unknown'),
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

async function getTCGPlayerListingsForProduct(productId: number, quantity: number) {
    const url = `https://mp-search-api.tcgplayer.com/v1/product/${productId}/listings?mpfev=3428`

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
        headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' },
        body: JSON.stringify(body),
    }

    const response = await throttledFetch(url, options)
    const data = await response.json()
    const result = await tcgplayerListingResponseSchema.parseAsync(data)
    const listings = result.results[0].results
    return listings
}

async function getTCGPlayerListingDetailsForProduct(productId: number) {
    const url = `https://mp-search-api.tcgplayer.com/v1/product/${productId}/details?mpfev=3428`

    const options = {
        method: 'GET',
        headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' },
    }

    const response = await throttledFetch(url, options)
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

async function getTCGPlayerSalesHistoryForProduct(productId: number, limit: number = 100) {
    const url = `https://mpapi.tcgplayer.com/v2/product/${productId}/latestsales?mpfev=3428`

    const body = {
        conditions: [],
        languages: [1], // English
        variants: [],
        listingType: 'ListingWithoutPhotos',
        limit: limit,
    }

    const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' },
        body: JSON.stringify(body),
    }

    const response = await throttledFetch(url, options)
    const data = await response.json()
    const result = await tcgplayerSaleHistoryResponseSchema.parseAsync(data)
    return result.data
}

async function clearSalesHistoryForPrinting(printing: Printing) {
    await drizzle.delete(salesHistory).where(eq(salesHistory.printingId, printing.id))
}

async function storeSalesHistoryForPrinting(sales: TCGPlayerSaleHistory[], printing: Printing) {
    const newSalesHistory = sales.map((sale) => {
        return {
            condition: sale.condition.toUpperCase() as Condition,
            edition: mapVariantToEdition(sale.variant) as Edition,
            quantity: sale.quantity,
            purchasePrice: sale.purchasePrice,
            shippingPrice: sale.shippingPrice,
            orderDate: parseJSON(sale.orderDate),
            printingId: printing.id,
        }
    })

    const insertedSales = await drizzle.insert(salesHistory).values(newSalesHistory).returning()

    await drizzle.update(printings)
        .set({
            salesLastScraped: new Date(),
        })
        .where(eq(printings.id, printing.id))

    return insertedSales
}

function mapVariantToEdition(variant: string): Edition {
    // Map variant names from TCGPlayer to our edition enum values
    switch (variant.toUpperCase()) {
        case '1ST EDITION':
            return '1ST EDITION'
        case 'UNLIMITED':
            return 'UNLIMITED'
        case 'LIMITED':
            return 'LIMITED'
        default:
            return 'ANY'
    }
}

// Calculate a "good deal" price based on listings and sales history
async function calculateGoodDealPrice(
    productListings: TCGPlayerListing[],
    salesData: TCGPlayerSaleHistory[],
    printing: Printing,
): Promise<number | null> {
    try {
        const desiredEdition = printing.desiredEdition
        const desiredCondition = printing.desiredCondition

        // console.log(`[calculateGoodDealPrice] Starting calculation for printing ${printing.setName}-${printing.setCode} (${printing.rarity})`)
        // console.log(`[calculateGoodDealPrice] Desired edition: ${desiredEdition}, condition: ${desiredCondition}`)
        // console.log(`[calculateGoodDealPrice] Input data - listings: ${productListings.length}, sales: ${salesData.length}`)

        // Helper functions for filtering (same logic as sellers endpoint)
        function conditionTest(listingCondition: Condition, desiredCondition: Condition): boolean {
            const left = conditionEnum.enumValues.indexOf(listingCondition)
            const right = conditionEnum.enumValues.indexOf(desiredCondition)
            return left <= right
        }

        function editionTest(listingEdition: Edition, desiredEdition: Edition): boolean {
            return (desiredEdition === 'ANY') || (desiredEdition === listingEdition)
        }

        // Filter listings to match desired edition and condition
        const matchingListings = productListings.filter((listing) => {
            const editionMatch = editionTest(listing.printing, desiredEdition)
            const conditionMatch = conditionTest(listing.condition, desiredCondition)
            // console.log(`[calculateGoodDealPrice] Listing - edition: ${listing.printing} (match: ${editionMatch}), condition: ${listing.condition} (match: ${conditionMatch})`)
            return editionMatch && conditionMatch
        })

        // Filter sales history to match desired edition and condition
        const matchingSales = salesData.filter((sale) => {
            const saleEdition = mapVariantToEdition(sale.variant)
            const saleCondition = sale.condition.toUpperCase() as Condition
            const editionMatch = editionTest(saleEdition, desiredEdition)
            const conditionMatch = conditionTest(saleCondition, desiredCondition)
            // console.log(`[calculateGoodDealPrice] Sale - edition: ${saleEdition} (match: ${editionMatch}), condition: ${saleCondition} (match: ${conditionMatch})`)
            return editionMatch && conditionMatch
        })

        // console.log(`[calculateGoodDealPrice] Filtered data - matching listings: ${matchingListings.length}, matching sales: ${matchingSales.length}`)

        // Collect all prices from both sources
        const allPrices: number[] = []

        // Add sales prices (weighted more heavily as they represent actual market transactions)
        if (matchingSales.length > 0) {
            const salesPrices = matchingSales.map(sale => sale.purchasePrice)
            // console.log(`[calculateGoodDealPrice] Sales prices: [${salesPrices.join(', ')}]`)
            // Add sales prices twice to give them more weight in the calculation
            allPrices.push(...salesPrices, ...salesPrices)
        }

        // Add current listing prices
        if (matchingListings.length > 0) {
            const listingPrices = matchingListings.map(listing => listing.price)
            // console.log(`[calculateGoodDealPrice] Listing prices: [${listingPrices.join(', ')}]`)
            allPrices.push(...listingPrices)
        }

        // If we have no matching data, return null
        if (allPrices.length === 0) {
            // console.log(`[calculateGoodDealPrice] No matching data found, returning null`)
            return null
        }

        // Sort all prices and calculate the 25th percentile as "good deal" price
        const sortedPrices = allPrices.sort((a, b) => a - b)
        const percentileIndex = Math.floor(sortedPrices.length * 0.25)
        const goodDealPrice = sortedPrices[percentileIndex]

        // console.log(`[calculateGoodDealPrice] All prices (${allPrices.length}): [${sortedPrices.join(', ')}]`)
        // console.log(`[calculateGoodDealPrice] 25th percentile index: ${percentileIndex}, good deal price: ${goodDealPrice}`)

        const finalPrice = Math.round(goodDealPrice * 100) / 100
        // console.log(`[calculateGoodDealPrice] Final calculated price: ${finalPrice}`)

        return finalPrice // Round to 2 decimal places
    }
    catch (error) {
        console.error('Error calculating good deal price:', error)
        return null
    }
}

export function useScraper() {
    async function scrapeListing(productId: number, quantity: number | undefined) {
        const productDetails = await getTCGPlayerListingDetailsForProduct(productId)
        const productListings = await getTCGPlayerListingsForProduct(productId, quantity ?? 50)

        const sellerMap = await getAndUpdateSellerMap(productListings)
        const card = await getOrInsertCard(productDetails)
        const printing = await getOrInsertPrinting(card, productDetails)

        // Get existing sales data to calculate good deal price
        const salesData = await drizzle.select()
            .from(salesHistory)
            .where(eq(salesHistory.printingId, printing.id))

        // Convert sales data to the expected format for the calculation
        const tcgSalesData = salesData.map(sale => ({
            condition: sale.condition,
            variant: sale.edition,
            language: 'English',
            quantity: sale.quantity,
            title: card.name,
            listingType: 'standard',
            customListingId: '',
            purchasePrice: sale.purchasePrice,
            shippingPrice: sale.shippingPrice,
            orderDate: sale.orderDate.toISOString(),
        }))

        await clearListingsForPrinting(printing)
        const insertedListings = await storeListingsForPrinting(productListings, sellerMap, printing)

        // Calculate and update good deal price
        const goodDealPrice = await calculateGoodDealPrice(productListings, tcgSalesData, printing)
        if (goodDealPrice !== null) {
            await drizzle.update(printings)
                .set({
                    goodDealPrice,
                })
                .where(eq(printings.id, printing.id))
        }

        const response = {
            cardName: card.name,
            setCode: printing.setCode,
            rarity: printing.rarity,
            numberOfSales: 0,
            numberOfListings: insertedListings.length,
            goodDealPrice,
        }

        return response
    }

    async function scrapeSalesHistory(productId: number, limit: number | undefined) {
        const productDetails = await getTCGPlayerListingDetailsForProduct(productId)
        const salesData = await getTCGPlayerSalesHistoryForProduct(productId, limit ?? 100)

        const card = await getOrInsertCard(productDetails)
        const printing = await getOrInsertPrinting(card, productDetails)

        await clearSalesHistoryForPrinting(printing)
        const insertedSales = await storeSalesHistoryForPrinting(salesData, printing)

        // Get current listings to calculate good deal price
        const listingsData = await drizzle.select()
            .from(listings)
            .where(eq(listings.printingId, printing.id))

        // Convert listing data to the expected format for the calculation
        const tcgListingsData = await Promise.all(listingsData.map(async (listing) => {
            const [seller] = await drizzle.select()
                .from(sellers)
                .where(eq(sellers.id, listing.sellerId))

            return {
                listingId: 0,
                channelId: 0,
                conditionId: 0,
                verifiedSeller: seller?.verified || false,
                directInventory: listing.directQuantity,
                rankedShippingPrice: seller?.shipping || 0,
                productId: printing.itemNo,
                printing: listing.edition,
                languageAbbreviation: 'EN',
                sellerName: seller?.name || '',
                forwardFreight: false,
                sellerShippingPrice: seller?.shipping || 0,
                language: 'English',
                shippingPrice: seller?.shipping || 0,
                condition: listing.condition,
                languageId: 1,
                score: 0,
                directSeller: seller?.direct || false,
                productConditionId: 0,
                sellerId: seller?.id.toString() || '0',
                listingType: 'standard',
                sellerRating: seller?.rating || 0,
                sellerSales: seller?.numberOfSales || '0',
                quantity: listing.quantity,
                sellerKey: seller?.key || '',
                price: listing.price,
                goldSeller: seller?.gold || false,
                directProduct: seller?.direct || false,
            }
        }))

        // Calculate and update good deal price
        const goodDealPrice = await calculateGoodDealPrice(tcgListingsData, salesData, printing)
        if (goodDealPrice !== null) {
            await drizzle.update(printings)
                .set({
                    goodDealPrice,
                })
                .where(eq(printings.id, printing.id))
        }

        const response = {
            cardName: card.name,
            setCode: printing.setCode,
            rarity: printing.rarity,
            numberOfSales: insertedSales.length,
            numberOfListings: 0,
            goodDealPrice,
        }

        return response
    }

    async function scrapeAll(productId: number, listingQuantity: number | undefined, salesLimit: number | undefined) {
        const productDetails = await getTCGPlayerListingDetailsForProduct(productId)

        // Fetch both listings and sales history in parallel
        const [productListings, salesData] = await Promise.all([
            getTCGPlayerListingsForProduct(productId, listingQuantity ?? 50),
            getTCGPlayerSalesHistoryForProduct(productId, salesLimit ?? 100),
        ])

        const sellerMap = await getAndUpdateSellerMap(productListings)
        const card = await getOrInsertCard(productDetails)
        const printing = await getOrInsertPrinting(card, productDetails)

        // Clear and store listings
        await clearListingsForPrinting(printing)
        const insertedListings = await storeListingsForPrinting(productListings, sellerMap, printing)

        // Clear and store sales history
        await clearSalesHistoryForPrinting(printing)
        const insertedSales = await storeSalesHistoryForPrinting(salesData, printing)

        // Calculate and update good deal price
        const goodDealPrice = await calculateGoodDealPrice(productListings, salesData, printing)
        if (goodDealPrice !== null) {
            await drizzle.update(printings)
                .set({
                    goodDealPrice,
                })
                .where(eq(printings.id, printing.id))
        }

        const response = {
            cardName: card.name,
            setCode: printing.setCode,
            rarity: printing.rarity,
            numberOfListings: insertedListings.length,
            numberOfSales: insertedSales.length,
            goodDealPrice,
        }

        return response
    }

    return {
        scrapeListing,
        scrapeSalesHistory,
        scrapeAll,
    }
}

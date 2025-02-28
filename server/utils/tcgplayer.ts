import { differenceInDays, parseJSON } from 'date-fns'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { cards, listings, printings, salesHistory, sellers } from '../../shared/utils/schema'

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

    const response = await throttledFetch(url, options)
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
    const url = `https://mpapi.tcgplayer.com/v2/product/${productId}/latestsales?mpfev=3297`

    const body = {
        conditions: [],
        languages: [1], // English
        variants: [],
        listingType: 'ListingWithoutPhotos',
        limit: limit,
    }

    const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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
        if (!salesData.length && !productListings.length) {
            return null
        }

        const desiredQuantity = printing.desiredQuantity || 1
        const desiredEdition = printing.desiredEdition || 'ANY'
        const desiredCondition = printing.desiredCondition || 'MODERATELY PLAYED'

        // Filter sales by desired conditions
        const filteredSales = salesData.filter((sale) => {
            const saleCondition = sale.condition.toUpperCase() as Condition
            const saleEdition = mapVariantToEdition(sale.variant)

            // Check if the sale matches our desired condition (or better)
            const conditionMatches = conditionRank(saleCondition) >= conditionRank(desiredCondition)

            // Check if the sale matches our desired edition (or ANY)
            const editionMatches = desiredEdition === 'ANY' || saleEdition === desiredEdition || saleEdition === 'ANY'

            return conditionMatches && editionMatches
        })

        // Extract prices from sales, considering quantity
        const salesPrices = filteredSales.map((sale) => {
            const totalPrice = sale.purchasePrice + sale.shippingPrice

            // If we want multiple cards and this sale had multiple, prioritize it
            const quantityMultiplier = (desiredQuantity > 1 && sale.quantity > 1) ? 0.9 : 1.0

            // Consider recency of sale - more recent sales get more weight
            const daysSinceSale = differenceInDays(new Date(), parseJSON(sale.orderDate))
            const recencyFactor = Math.max(0.8, 1 - (daysSinceSale / 100))

            return {
                price: totalPrice * quantityMultiplier * recencyFactor,
                date: parseJSON(sale.orderDate),
                quantity: sale.quantity,
            }
        }).sort((a, b) => a.price - b.price)

        // Calculate sales statistics
        let salesMedian = null
        let salesTrend = 0
        let salesRate = 0

        if (salesPrices.length > 0) {
            // Calculate median price
            const mid = Math.floor(salesPrices.length / 2)
            salesMedian = salesPrices.length % 2 === 0
                ? (salesPrices[mid - 1].price + salesPrices[mid].price) / 2
                : salesPrices[mid].price

            // Calculate sales trend (price change over time)
            if (salesPrices.length >= 5) {
                // Sort by date for trend analysis
                const byDate = [...salesPrices].sort((a, b) => b.date.getTime() - a.date.getTime())
                const recentAvg = byDate.slice(0, Math.min(3, byDate.length))
                    .reduce((sum, s) => sum + s.price, 0) / Math.min(3, byDate.length)
                const olderAvg = byDate.slice(Math.max(3, byDate.length - 3))
                    .reduce((sum, s) => sum + s.price, 0) / Math.min(3, byDate.length)

                salesTrend = (recentAvg - olderAvg) / olderAvg // percentage change
            }

            // Calculate sales rate (sales per day)
            if (salesPrices.length >= 2) {
                const newest = new Date(Math.max(...salesPrices.map(s => s.date.getTime())))
                const oldest = new Date(Math.min(...salesPrices.map(s => s.date.getTime())))
                const daySpan = Math.max(1, differenceInDays(newest, oldest))
                salesRate = salesPrices.length / daySpan
            }
        }

        // Filter and analyze listings
        const filteredListings = productListings.filter((listing) => {
            const listingCondition = listing.condition
            const listingEdition = listing.printing

            // Check if the listing matches our desired condition (or better)
            const conditionMatches = conditionRank(listingCondition) >= conditionRank(desiredCondition)

            // Check if the listing matches our desired edition (or ANY)
            const editionMatches = desiredEdition === 'ANY' || listingEdition === desiredEdition || listingEdition === 'ANY'

            // Check quantity
            const quantityMatches = listing.quantity >= desiredQuantity

            return conditionMatches && editionMatches && quantityMatches
        })

        const listingPrices = filteredListings.map((listing) => {
            // Total price including shipping
            return listing.price + listing.shippingPrice
        }).sort((a, b) => a - b)

        // Calculate listings statistics
        let listingsPercentile = null

        if (listingPrices.length > 0) {
            // Calculate 25th percentile (good deal threshold)
            const percentileIndex = Math.floor(listingPrices.length * 0.25)
            listingsPercentile = listingPrices[percentileIndex]
        }

        // Determine good deal price based on all factors
        if (salesMedian && listingsPercentile) {
            // Base the good deal price on both sales and listings
            let goodDealBase = Math.min(salesMedian * 0.9, listingsPercentile)

            // Adjust for trend
            if (salesTrend < -0.1) {
                // Trending down, be more aggressive
                goodDealBase *= 0.9
            }
            else if (salesTrend > 0.1) {
                // Trending up, can be less aggressive
                goodDealBase *= 0.95
            }

            // Adjust for sales rate
            if (salesRate > 1) {
                // High demand, be less aggressive
                goodDealBase *= 0.95
            }
            else if (salesRate < 0.2) {
                // Low demand, be more aggressive
                goodDealBase *= 0.85
            }

            return parseFloat(goodDealBase.toFixed(2))
        }
        else if (salesMedian) {
            // Only have sales data
            return parseFloat((salesMedian * 0.85).toFixed(2))
        }
        else if (listingsPercentile) {
            // Only have listings data
            return parseFloat((listingsPercentile * 0.9).toFixed(2))
        }

        // Fallback to market price if available
        if (printing.marketPrice) {
            return parseFloat((printing.marketPrice * 0.85).toFixed(2))
        }

        return null
    }
    catch (error) {
        console.error('Error calculating good deal price:', error)
        return null
    }
}

// Helper function to rank conditions from worst to best
function conditionRank(condition: Condition): number {
    const ranks = {
        'DAMAGED': 1,
        'HEAVILY PLAYED': 2,
        'MODERATELY PLAYED': 3,
        'LIGHTLY PLAYED': 4,
        'NEAR MINT': 5,
    }
    return ranks[condition] || 0
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

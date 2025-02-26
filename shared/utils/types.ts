import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export type Seller = typeof sellers.$inferSelect
export type Card = typeof cards.$inferSelect
export type Printing = typeof printings.$inferSelect
export type Listing = typeof listings.$inferSelect

export type SellerInsert = typeof sellers.$inferInsert
export type CardInsert = typeof cards.$inferInsert
export type PrintingInsert = typeof printings.$inferInsert
export type ListingInsert = typeof listings.$inferInsert

export const sellerSelectSchema = createSelectSchema(sellers)
export const cardSelectSchema = createSelectSchema(cards)
export const printingSelectSchema = createSelectSchema(printings)
export const listingSelectSchema = createSelectSchema(listings)

export const sellerInsertSchema = createInsertSchema(sellers)
export const cardInsertSchema = createInsertSchema(cards)
export const printingInsertSchema = createInsertSchema(printings)
export const listingInsertSchema = createInsertSchema(listings)

export function takeUniqueOrThrow<T>(values: T[]): T {
    if (values.length !== 1)
        throw new Error('Found non unique or inexistent value')
    return values[0]!
}

export const listingsRecordSchema = z.object({
    printing: printingSelectSchema,
    listings: z.record(z.number(), listingSelectSchema),
})

export const printingsRecordSchema = z.object({
    card: cardSelectSchema,
    printings: z.record(z.number(), listingsRecordSchema),
})

export const cardsRecordSchema = z.object({
    seller: sellerSelectSchema,
    cards: z.record(z.number(), printingsRecordSchema),
})

export const sellersRecordSchema = z.record(z.number(), cardsRecordSchema)

export const listingsArraySchema = z.object({
    printing: printingSelectSchema,
    listings: z.array(listingSelectSchema),
})

export const printingsArraySchema = z.object({
    card: cardSelectSchema,
    printings: z.array(listingsArraySchema),
})

export const cardsArraySchema = z.object({
    seller: sellerSelectSchema,
    cards: z.array(printingsArraySchema),
})

export const sellersArraySchema = z.array(cardsArraySchema)

export type SellersRecord = z.infer<typeof sellersRecordSchema>
export type SellersArray = z.infer<typeof sellersArraySchema>
export type SellersPlus = z.infer<typeof cardsArraySchema>
export type PrintingPlus = z.infer<typeof printingsArraySchema>

export const conditions = z.enum(conditionEnum.enumValues)
export type Condition = z.infer<typeof conditions>
export const conditionValues = conditionEnum.enumValues.map(v => ({
    label: v,
    value: v,
}))

export const editions = z.enum(editionEnum.enumValues)
export type Edition = z.infer<typeof editions>
export const editionValues = editionEnum.enumValues.map(v => ({
    label: v,
    value: v,
}))

export const priorities = z.enum(priorityEnum.enumValues)
export type Priority = z.infer<typeof priorities>
export const priorityValues = priorityEnum.enumValues.map(v => ({
    label: v,
    value: v,
}))

export const quantityValues = [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
]

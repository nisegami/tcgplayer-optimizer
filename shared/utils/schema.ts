import { boolean, integer, pgEnum, pgTable, real, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const conditionEnum = pgEnum('condition', ['NEAR MINT', 'LIGHTLY PLAYED', 'MODERATELY PLAYED', 'HEAVILY PLAYED', 'DAMAGED'])
export const editionEnum = pgEnum('edition', ['ANY', '1ST EDITION', 'LIMITED', 'UNLIMITED'])
export const priorityEnum = pgEnum('priority', ['DISABLED', 'ENABLED', 'PRIORITY', 'FORCE'])

export const sellers = pgTable('sellers', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    shipping: real('shipping').notNull(),
    rating: real('rating').notNull(),
    numberOfSales: text('number_of_sales').notNull(),

    freeShipping: boolean('free_shipping').notNull(),
    gold: boolean('gold').notNull(),
    direct: boolean('direct').notNull(),
    verified: boolean('verified').notNull(),

    blocked: boolean('blocked').notNull().default(false),
})

export const cards = pgTable('cards', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
})

export const printings = pgTable('printings', {
    id: serial('id').primaryKey(),
    itemNo: integer('item_no').notNull(),
    setName: text('set_name').notNull(),
    setCode: text('set_code').notNull(),
    rarity: text('rarity').notNull(),
    marketPrice: real('market_price').notNull(),
    cardId: integer('card_id').references(() => cards.id).notNull(),
    maxPrice: integer('max_price'),
    priority: priorityEnum('priority').notNull().default('ENABLED'),
    desiredQuantity: integer('desired_quantity').notNull().default(1),
    desiredEdition: editionEnum('desired_edition').notNull().default('ANY'),
    desiredCondition: conditionEnum('desired_condition').notNull().default('MODERATELY PLAYED'),
    lastScraped: timestamp('last_scraped'),
})

export const listings = pgTable('listings', {
    id: serial('id').primaryKey(),
    price: real('price').notNull(),
    quantity: integer('quantity').notNull(),
    directQuantity: integer('direct_quantity').notNull(),
    condition: conditionEnum('condition').notNull(),
    edition: editionEnum('edition').notNull(),
    printingId: integer('printing_id').references(() => printings.id).notNull(),
    sellerId: integer('seller_id').references(() => sellers.id).notNull(),
})

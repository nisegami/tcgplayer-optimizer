import { boolean, integer, pgEnum, pgTable, real, serial, text, timestamp } from 'drizzle-orm/pg-core'

// PostgreSQL enums for domain-specific types
export const conditionEnum = pgEnum('condition', ['NEAR MINT', 'LIGHTLY PLAYED', 'MODERATELY PLAYED', 'HEAVILY PLAYED', 'DAMAGED'])
export const editionEnum = pgEnum('edition', ['ANY', '1ST EDITION', 'LIMITED', 'UNLIMITED'])
export const priorityEnum = pgEnum('priority', ['DISABLED', 'HIDE', 'ENABLED', 'PRIORITY', 'FORCE', 'ARCHIVED'])

// Seller information table
export const sellers = pgTable('sellers', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    shipping: real('shipping').notNull(),
    rating: real('rating').notNull(),
    numberOfSales: text('number_of_sales').notNull(),

    // Seller status flags
    freeShipping: boolean('free_shipping').notNull(),
    gold: boolean('gold').notNull(),
    direct: boolean('direct').notNull(),
    verified: boolean('verified').notNull(),

    // Administrative flags
    blocked: boolean('blocked').notNull().$default(() => false),
})

// Card master data table
export const cards = pgTable('cards', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
})

// Card printings with tracking preferences
export const printings = pgTable('printings', {
    id: serial('id').primaryKey(),

    // Card identification
    itemNo: integer('item_no').notNull(),
    setName: text('set_name').notNull(),
    setCode: text('set_code').notNull(),
    rarity: text('rarity').notNull(),
    marketPrice: real('market_price').notNull(),
    cardId: integer('card_id').references(() => cards.id).notNull(),

    // Purchase preferences
    maxPrice: integer('max_price'),
    priority: priorityEnum('priority').notNull().$default(() => 'ENABLED'),
    desiredQuantity: integer('desired_quantity').notNull().$default(() => 1),
    desiredEdition: editionEnum('desired_edition').notNull().$default(() => 'ANY'),
    desiredCondition: conditionEnum('desired_condition').notNull().$default(() => 'MODERATELY PLAYED'),

    // Scraping metadata
    lastScraped: timestamp('last_scraped'),
    salesLastScraped: timestamp('sales_last_scraped'),
    goodDealPrice: real('good_deal_price'),
})

// Available card listings from sellers
export const listings = pgTable('listings', {
    id: serial('id').primaryKey(),

    // Pricing and availability
    price: real('price').notNull(),
    quantity: integer('quantity').notNull(),
    directQuantity: integer('direct_quantity').notNull(),

    // Card condition details
    condition: conditionEnum('condition').notNull(),
    edition: editionEnum('edition').notNull(),

    // Relations
    printingId: integer('printing_id').references(() => printings.id).notNull(),
    sellerId: integer('seller_id').references(() => sellers.id).notNull(),
})

// Historical sales data for price tracking
export const salesHistory = pgTable('sales_history', {
    id: serial('id').primaryKey(),

    // Card details
    condition: conditionEnum('condition').notNull(),
    edition: editionEnum('edition').notNull(),
    quantity: integer('quantity').notNull(),

    // Pricing information
    purchasePrice: real('purchase_price').notNull(),
    shippingPrice: real('shipping_price').notNull(),

    // Transaction metadata
    orderDate: timestamp('order_date').notNull(),
    printingId: integer('printing_id').references(() => printings.id).notNull(),
})

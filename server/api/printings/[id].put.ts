import { eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        id: z.coerce.number(),
    })
    const params = await getValidatedRouterParams(event, schema.parseAsync)

    const partialSchema = printingInsertSchema.pick({
        maxPrice: true,
        priority: true,
        desiredQuantity: true,
        desiredEdition: true,
        desiredCondition: true,
    }).partial().strict()

    const body = await readValidatedBody(event, partialSchema.parseAsync)

    const drizzle = useDrizzle()

    return await drizzle.update(printings)
        .set(body)
        .where(eq(printings.id, params.id))
        .returning()
})

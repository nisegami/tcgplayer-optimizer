import { and, eq, isNull, lt, or } from 'drizzle-orm'

export default defineEventHandler(async () => {
    const db = useDrizzle()
    const { scrapeListing } = useScraper()

    const twentyFourHoursAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    const eligiblePrintings = await db.select()
        .from(printings)
        .where(and(
            or(
                eq(printings.priority, 'ENABLED'),
                eq(printings.priority, 'PRIORITY'),
                eq(printings.priority, 'FORCE'),
            ),
            or(
                lt(printings.lastScraped, twentyFourHoursAgo),
                isNull(printings.lastScraped),
            ),
        ))

    const results = []
    const errors = []

    // Process each eligible printing
    for (const printing of eligiblePrintings) {
        try {
            const result = await scrapeListing(printing.itemNo, 50)
            results.push({
                itemNo: printing.itemNo,
                ...result,
            })
        }
        catch (error) {
            errors.push({
                itemNo: printing.itemNo,
                error: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    return {
        refreshedCount: results.length,
        errorCount: errors.length,
        results,
        errors,
    }
})

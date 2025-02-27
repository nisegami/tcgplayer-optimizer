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
                eq(printings.priority, 'HIDE'),
            ),
            or(
                lt(printings.lastScraped, twentyFourHoursAgo),
                isNull(printings.lastScraped),
            ),
        ))

    const results = []
    const errors = []

    const startTime = Date.now()
    const totalPrintings = eligiblePrintings.length

    // Process each eligible printing
    for (let i = 0; i < eligiblePrintings.length; i++) {
        const printing = eligiblePrintings[i]
        const progress = Math.round((i / totalPrintings) * 100)

        try {
            console.log(`[${progress}%] Processing ${i + 1}/${totalPrintings}: Item #${printing.itemNo}`)
            const result = await scrapeListing(printing.itemNo, 50)
            results.push({
                itemNo: printing.itemNo,
                ...result,
            })
        }
        catch (error) {
            console.error(`[${progress}%] Error processing ${i + 1}/${totalPrintings}: Item #${printing.itemNo}`)
            errors.push({
                itemNo: printing.itemNo,
                error: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    const endTime = Date.now()
    const duration = endTime - startTime
    const durationInSeconds = Math.round(duration / 1000)
    const averageTimePerCard = Math.round(duration / totalPrintings)

    return {
        refreshedCount: results.length,
        errorCount: errors.length,
        totalEligible: totalPrintings,
        durationSeconds: durationInSeconds,
        averageTimePerCardMs: averageTimePerCard,
        results,
        errors,
    }
})

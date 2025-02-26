import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'

// const db = drizzle(process.env.DATABASE_URL!);

export function useDrizzle() {
    return drizzle(process.env.DATABASE_URL!)
}

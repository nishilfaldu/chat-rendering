import {
  seedDatabase,
  expectedHeightCount,
  heightMeasurementCount,
} from "./db.ts"
import { measureHeights } from "./measure.ts"

const force = process.argv.includes("--force")
const result = await seedDatabase({ force })
console.log(`seeded ${result.count} messages at ${result.sqlite}`)

const heights = await measureHeights({
  force: force || heightMeasurementCount() < expectedHeightCount(),
})
console.log(`measured ${heights.count} height rows`)

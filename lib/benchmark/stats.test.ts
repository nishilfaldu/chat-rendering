import assert from "node:assert/strict"
import test from "node:test"
import { numericSummary, percentile } from "./stats.ts"

test("percentile uses nearest-rank aggregation", () => {
  const values = Array.from({ length: 20 }, (_, index) => index + 1)
  assert.equal(percentile(values, 0.5), 10)
  assert.equal(percentile(values, 0.95), 19)
})

test("numeric summaries ignore unavailable and non-finite samples", () => {
  assert.deepEqual(numericSummary([null, Number.NaN, 4, 8, 12]), {
    median: 8,
    p95: 12,
  })
  assert.deepEqual(numericSummary([null, Number.NaN]), {
    median: null,
    p95: null,
  })
})

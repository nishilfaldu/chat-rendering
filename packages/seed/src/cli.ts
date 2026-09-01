import { seedDatabase } from "./db.ts";

const force = process.argv.includes("--force");
const result = await seedDatabase({ force });
console.log(`seeded ${result.count} messages at ${result.sqlite}`);

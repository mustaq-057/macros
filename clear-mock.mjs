import { sql } from './src/db/neon.js';

async function clearMock() {
  try {
    await sql`TRUNCATE TABLE meals, activities;`;
    await sql`UPDATE daily_stats SET water = 0;`;
    console.log('SUCCESS: All mock meals and activities removed, water reset to 0 in Neon DB!');
  } catch (err) {
    console.error('Error clearing mock data:', err);
    process.exit(1);
  }
}

clearMock();

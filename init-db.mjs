import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';

const sql = neon(DATABASE_URL);

async function init() {
  console.log('Connecting to Neon DB and setting up schema...');
  try {
    // 1. Meals table
    await sql`
      CREATE TABLE IF NOT EXISTS meals (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        calories INTEGER NOT NULL,
        protein NUMERIC DEFAULT 0,
        carbs NUMERIC DEFAULT 0,
        fat NUMERIC DEFAULT 0,
        fiber NUMERIC DEFAULT 0,
        time TEXT,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Activities table
    await sql`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        calories INTEGER NOT NULL,
        time TEXT,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Daily Stats table (water intake, notes, date)
    await sql`
      CREATE TABLE IF NOT EXISTS daily_stats (
        date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
        water INTEGER DEFAULT 0,
        reminder_interval INTEGER DEFAULT 90,
        reminder_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Insert today's daily_stats if not exists (water at 0)
    await sql`
      INSERT INTO daily_stats (date, water)
      VALUES (CURRENT_DATE, 0)
      ON CONFLICT (date) DO NOTHING;
    `;

    console.log('Database schema ready with clean tables: meals, activities, daily_stats!');

    console.log('Database initialized successfully with tables: meals, activities, daily_stats!');
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

init();

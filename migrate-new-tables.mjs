import { sql } from './src/db/neon.js';

async function migrate() {
  console.log('Creating user_goals table...');
  await sql`
    CREATE TABLE IF NOT EXISTS user_goals (
      id INT PRIMARY KEY DEFAULT 1,
      calories INT DEFAULT 2200,
      protein INT DEFAULT 150,
      carbs INT DEFAULT 220,
      fat INT DEFAULT 70,
      fiber INT DEFAULT 30,
      water INT DEFAULT 8,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    INSERT INTO user_goals (id, calories, protein, carbs, fat, fiber, water)
    VALUES (1, 2200, 150, 220, 70, 30, 8)
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log('Creating favorites table...');
  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      calories INT NOT NULL,
      protein NUMERIC DEFAULT 0,
      carbs NUMERIC DEFAULT 0,
      fat NUMERIC DEFAULT 0,
      fiber NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  console.log('Migration completed successfully!');
}

migrate().catch(console.error);

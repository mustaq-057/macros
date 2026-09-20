import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Load .env manually
try {
  const env = readFileSync('.env', 'utf8');
  env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  });
} catch (e) {}

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('🔧 Migrating DB for per-device user isolation...\n');

  try {
    // 1. Add user_id to meals
    await sql`ALTER TABLE meals ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default';`;
    await sql`CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);`;
    console.log('✅ meals.user_id added');

    // 2. Add user_id to activities
    await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default';`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, date);`;
    console.log('✅ activities.user_id added');

    // 3. daily_stats: drop old PK (date only), add user_id, new composite PK
    await sql`ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default';`;
    // Drop old primary key constraint and create new composite one
    try {
      await sql`ALTER TABLE daily_stats DROP CONSTRAINT IF EXISTS daily_stats_pkey;`;
      await sql`ALTER TABLE daily_stats ADD PRIMARY KEY (user_id, date);`;
    } catch (e) {
      console.warn('daily_stats PK change skipped (may already exist):', e.message);
    }
    console.log('✅ daily_stats.user_id added');

    // 4. user_goals: drop id=1 approach, add user_id as PK
    await sql`ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS user_id TEXT;`;
    try {
      await sql`UPDATE user_goals SET user_id = 'default' WHERE user_id IS NULL;`;
      await sql`ALTER TABLE user_goals ALTER COLUMN user_id SET NOT NULL;`;
    } catch (e) {}
    // Fix PK to be user_id
    try {
      await sql`ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_pkey;`;
    } catch(e) {}
    try {
      await sql`ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_user_id_pk;`;
    } catch(e) {}
    try {
      await sql`ALTER TABLE user_goals ADD CONSTRAINT user_goals_uid_pk PRIMARY KEY (user_id);`;
      console.log('✅ user_goals.user_id set as PRIMARY KEY');
    } catch(e) {
      console.log('user_goals PK note:', e.message);
    }

    // 5. Add user_id to favorites
    await sql`ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default';`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);`;
    console.log('✅ favorites.user_id added');

    console.log('\n🎉 Migration complete! All tables now support per-device isolation.');
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();

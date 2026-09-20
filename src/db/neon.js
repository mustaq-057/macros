import { neon } from '@neondatabase/serverless';

const _FALLBACK_DB = (typeof atob !== 'undefined')
  ? atob('cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfOXZ5RTRKRmVHV1RvQGVwLWx1Y2t5LWJyb29rLWI1enVsdDYwLXBvb2xlci5jLTcudXMtZWFzdC0yLmF3cy5uZW9uLnRlY2gvbmVvbmRiP3NzbG1vZGU9cmVxdWlyZSZjaGFubmVsX2JpbmRpbmc9cmVxdWlyZQ==')
  : '';

export const DATABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DATABASE_URL)
  ? import.meta.env.VITE_DATABASE_URL
  : ((typeof process !== 'undefined' && process.env && (process.env.VITE_DATABASE_URL || process.env.DATABASE_URL)) || _FALLBACK_DB);

export const sql = neon(DATABASE_URL || _FALLBACK_DB);

/**
 * Fetch all meals for today
 */
export async function fetchMeals() {
  try {
    const rows = await sql`
      SELECT id, name, calories, 
             COALESCE(protein, 0)::numeric as protein, 
             COALESCE(carbs, 0)::numeric as carbs, 
             COALESCE(fat, 0)::numeric as fat, 
             COALESCE(fiber, 0)::numeric as fiber, 
             photo_url, time, date
      FROM meals
      WHERE date = CURRENT_DATE
      ORDER BY id ASC;
    `;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      calories: Number(r.calories) || 0,
      protein: Number(r.protein) || 0,
      carbs: Number(r.carbs) || 0,
      fat: Number(r.fat) || 0,
      fiber: Number(r.fiber) || 0,
      photoUrl: r.photo_url || null,
      time: r.time || ''
    }));
  } catch (err) {
    console.error('Error fetching meals from Neon:', err);
    throw err;
  }
}

/**
 * Add a new meal to Neon
 */
export async function insertMeal({ name, calories, protein = 0, carbs = 0, fat = 0, fiber = 0, photoUrl = null, time }) {
  try {
    const rows = await sql`
      INSERT INTO meals (name, calories, protein, carbs, fat, fiber, photo_url, time, date)
      VALUES (${name}, ${calories}, ${protein}, ${carbs}, ${fat}, ${fiber}, ${photoUrl}, ${time}, CURRENT_DATE)
      RETURNING id, name, calories, protein, carbs, fat, fiber, photo_url, time;
    `;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      calories: Number(r.calories) || 0,
      protein: Number(r.protein) || 0,
      carbs: Number(r.carbs) || 0,
      fat: Number(r.fat) || 0,
      fiber: Number(r.fiber) || 0,
      photoUrl: r.photo_url || null,
      time: r.time || ''
    };
  } catch (err) {
    console.error('Error inserting meal into Neon:', err);
    throw err;
  }
}

/**
 * Delete a meal
 */
export async function removeMealFromDb(id) {
  try {
    await sql`DELETE FROM meals WHERE id = ${id};`;
    return true;
  } catch (err) {
    console.error('Error deleting meal from Neon:', err);
    throw err;
  }
}

/**
 * Fetch activities for today
 */
export async function fetchActivities() {
  try {
    const rows = await sql`
      SELECT id, name, calories, time, date
      FROM activities
      WHERE date = CURRENT_DATE
      ORDER BY id ASC;
    `;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      calories: Number(r.calories) || 0,
      time: r.time || ''
    }));
  } catch (err) {
    console.error('Error fetching activities from Neon:', err);
    throw err;
  }
}

/**
 * Add an activity
 */
export async function insertActivity({ name, calories, time }) {
  try {
    const rows = await sql`
      INSERT INTO activities (name, calories, time, date)
      VALUES (${name}, ${calories}, ${time}, CURRENT_DATE)
      RETURNING id, name, calories, time;
    `;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      calories: Number(r.calories) || 0,
      time: r.time || ''
    };
  } catch (err) {
    console.error('Error inserting activity into Neon:', err);
    throw err;
  }
}

/**
 * Delete an activity
 */
export async function removeActivityFromDb(id) {
  try {
    await sql`DELETE FROM activities WHERE id = ${id};`;
    return true;
  } catch (err) {
    console.error('Error deleting activity from Neon:', err);
    throw err;
  }
}

/**
 * Fetch daily stats (water intake and reminder preferences)
 */
export async function fetchDailyStats() {
  try {
    const rows = await sql`
      SELECT date, water, reminder_interval, reminder_enabled
      FROM daily_stats
      WHERE date = CURRENT_DATE;
    `;
    if (rows.length > 0) {
      return {
        water: Number(rows[0].water) || 0,
        reminderInterval: Number(rows[0].reminder_interval) || 90,
        reminderEnabled: rows[0].reminder_enabled ?? true,
      };
    }
    // If not found, insert default for today
    await sql`
      INSERT INTO daily_stats (date, water, reminder_interval, reminder_enabled)
      VALUES (CURRENT_DATE, 0, 90, true)
      ON CONFLICT (date) DO NOTHING;
    `;
    return { water: 0, reminderInterval: 90, reminderEnabled: true };
  } catch (err) {
    console.error('Error fetching daily stats from Neon:', err);
    throw err;
  }
}

/**
 * Update water intake for today
 */
export async function saveWaterIntake(water) {
  try {
    await sql`
      INSERT INTO daily_stats (date, water, updated_at)
      VALUES (CURRENT_DATE, ${water}, CURRENT_TIMESTAMP)
      ON CONFLICT (date)
      DO UPDATE SET water = ${water}, updated_at = CURRENT_TIMESTAMP;
    `;
    return water;
  } catch (err) {
    console.error('Error saving water intake to Neon:', err);
    throw err;
  }
}

/**
 * Update reminder preferences
 */
export async function saveReminderSettings({ enabled, interval }) {
  try {
    await sql`
      INSERT INTO daily_stats (date, reminder_enabled, reminder_interval, updated_at)
      VALUES (CURRENT_DATE, ${enabled}, ${interval}, CURRENT_TIMESTAMP)
      ON CONFLICT (date)
      DO UPDATE SET reminder_enabled = ${enabled}, reminder_interval = ${interval}, updated_at = CURRENT_TIMESTAMP;
    `;
    return true;
  } catch (err) {
    console.error('Error saving reminder settings to Neon:', err);
    throw err;
  }
}

/**
 * Fetch persistent user goals
 */
export async function fetchUserGoals() {
  try {
    const rows = await sql`
      SELECT calories, protein, carbs, fat, fiber, water
      FROM user_goals
      WHERE id = 1;
    `;
    if (rows.length > 0) {
      return {
        calories: Number(rows[0].calories) || 2200,
        protein: Number(rows[0].protein) || 150,
        carbs: Number(rows[0].carbs) || 220,
        fat: Number(rows[0].fat) || 70,
        fiber: Number(rows[0].fiber) || 30,
        water: Number(rows[0].water) || 8,
      };
    }
    return { calories: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30, water: 8 };
  } catch (err) {
    console.error('Error fetching user goals from Neon:', err);
    return { calories: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30, water: 8 };
  }
}

/**
 * Update persistent user goals
 */
export async function saveUserGoals({ calories, protein, carbs, fat, fiber = 30, water = 8 }) {
  try {
    await sql`
      INSERT INTO user_goals (id, calories, protein, carbs, fat, fiber, water, updated_at)
      VALUES (1, ${calories}, ${protein}, ${carbs}, ${fat}, ${fiber}, ${water}, CURRENT_TIMESTAMP)
      ON CONFLICT (id)
      DO UPDATE SET 
        calories = ${calories},
        protein = ${protein},
        carbs = ${carbs},
        fat = ${fat},
        fiber = ${fiber},
        water = ${water},
        updated_at = CURRENT_TIMESTAMP;
    `;
    return { calories, protein, carbs, fat, fiber, water };
  } catch (err) {
    console.error('Error saving user goals to Neon:', err);
    throw err;
  }
}

/**
 * Fetch favorite meals
 */
export async function fetchFavorites() {
  try {
    const rows = await sql`
      SELECT id, name, calories, 
             COALESCE(protein, 0)::numeric as protein, 
             COALESCE(carbs, 0)::numeric as carbs, 
             COALESCE(fat, 0)::numeric as fat, 
             COALESCE(fiber, 0)::numeric as fiber
      FROM favorites
      ORDER BY id DESC;
    `;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      calories: Number(r.calories) || 0,
      protein: Number(r.protein) || 0,
      carbs: Number(r.carbs) || 0,
      fat: Number(r.fat) || 0,
      fiber: Number(r.fiber) || 0,
    }));
  } catch (err) {
    console.error('Error fetching favorites from Neon:', err);
    return [];
  }
}

/**
 * Insert a meal into favorites
 */
export async function insertFavorite({ name, calories, protein = 0, carbs = 0, fat = 0, fiber = 0 }) {
  try {
    const rows = await sql`
      INSERT INTO favorites (name, calories, protein, carbs, fat, fiber)
      VALUES (${name}, ${calories}, ${protein}, ${carbs}, ${fat}, ${fiber})
      RETURNING id, name, calories, protein, carbs, fat, fiber;
    `;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      calories: Number(r.calories) || 0,
      protein: Number(r.protein) || 0,
      carbs: Number(r.carbs) || 0,
      fat: Number(r.fat) || 0,
      fiber: Number(r.fiber) || 0,
    };
  } catch (err) {
    console.error('Error inserting favorite into Neon:', err);
    throw err;
  }
}

/**
 * Delete a favorite meal
 */
export async function removeFavorite(id) {
  try {
    await sql`DELETE FROM favorites WHERE id = ${id};`;
    return true;
  } catch (err) {
    console.error('Error deleting favorite from Neon:', err);
    throw err;
  }
}

/**
 * Fetch real aggregate macro history for past 30 days from Neon DB
 */
export async function fetchPastHistoryFromDb() {
  try {
    const [mealRows, actRows, waterRows] = await Promise.all([
      sql`
        SELECT 
          date::text as date_str,
          COALESCE(SUM(calories), 0)::int as calories,
          COALESCE(SUM(protein), 0)::numeric as protein,
          COALESCE(SUM(carbs), 0)::numeric as carbs,
          COALESCE(SUM(fat), 0)::numeric as fat
        FROM meals
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date;
      `,
      sql`
        SELECT 
          date::text as date_str,
          COALESCE(SUM(calories), 0)::int as burn
        FROM activities
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date;
      `,
      sql`
        SELECT 
          date::text as date_str,
          water
        FROM daily_stats
        WHERE date >= CURRENT_DATE - INTERVAL '30 days';
      `
    ]);

    const map = {};
    if (mealRows) {
      mealRows.forEach((r) => {
        const k = (r.date_str || '').split('T')[0];
        if (!k) return;
        map[k] = {
          calories: Number(r.calories) || 0,
          protein: Math.round(Number(r.protein) || 0),
          carbs: Math.round(Number(r.carbs) || 0),
          fat: Math.round(Number(r.fat) || 0),
          burn: 0,
          water: 0,
        };
      });
    }

    if (actRows) {
      actRows.forEach((r) => {
        const k = (r.date_str || '').split('T')[0];
        if (!k) return;
        if (!map[k]) map[k] = { calories: 0, protein: 0, carbs: 0, fat: 0, burn: 0, water: 0 };
        map[k].burn = Number(r.burn) || 0;
      });
    }

    if (waterRows) {
      waterRows.forEach((r) => {
        const k = (r.date_str || '').split('T')[0];
        if (!k) return;
        if (!map[k]) map[k] = { calories: 0, protein: 0, carbs: 0, fat: 0, burn: 0, water: 0 };
        map[k].water = Number(r.water) || 0;
      });
    }

    return map;
  } catch (err) {
    console.error('Error fetching macro history from Neon:', err);
    return {};
  }
}



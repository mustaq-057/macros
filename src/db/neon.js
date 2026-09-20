import { neon } from '@neondatabase/serverless';

const _FALLBACK_DB = (typeof atob !== 'undefined')
  ? atob('cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfOXZ5RTRKRmVHV1RvQGVwLWx1Y2t5LWJyb29rLWI1enVsdDYwLXBvb2xlci5jLTcudXMtZWFzdC0yLmF3cy5uZW9uLnRlY2gvbmVvbmRiP3NzbG1vZGU9cmVxdWlyZSZjaGFubmVsX2JpbmRpbmc9cmVxdWlyZQ==')
  : '';

export const DATABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DATABASE_URL)
  ? import.meta.env.VITE_DATABASE_URL
  : ((typeof process !== 'undefined' && process.env && (process.env.VITE_DATABASE_URL || process.env.DATABASE_URL)) || _FALLBACK_DB);

export const sql = neon(DATABASE_URL || _FALLBACK_DB);

/* ─────────────────────────────────────────────────────────────────────────
   DEVICE ID — generated once per install, stored in localStorage forever.
   This is what isolates one user's data from another's completely.
   Each phone gets a unique UUID — no login needed.
   ───────────────────────────────────────────────────────────────────────── */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem('jazz_device_id');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('jazz_device_id', id);
    }
    return id;
  } catch (e) {
    return 'default';
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   MEALS
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Fetch all meals for today (this device only)
 */
export async function fetchMeals() {
  const uid = getDeviceId();
  try {
    const rows = await sql`
      SELECT id, name, calories, 
             COALESCE(protein, 0)::numeric as protein, 
             COALESCE(carbs, 0)::numeric as carbs, 
             COALESCE(fat, 0)::numeric as fat, 
             COALESCE(fiber, 0)::numeric as fiber, 
             photo_url, time, date
      FROM meals
      WHERE date = CURRENT_DATE AND user_id = ${uid}
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
 * Add a new meal to Neon (tagged to this device)
 */
export async function insertMeal({ name, calories, protein = 0, carbs = 0, fat = 0, fiber = 0, photoUrl = null, time }) {
  const uid = getDeviceId();
  try {
    const rows = await sql`
      INSERT INTO meals (name, calories, protein, carbs, fat, fiber, photo_url, time, date, user_id)
      VALUES (${name}, ${calories}, ${protein}, ${carbs}, ${fat}, ${fiber}, ${photoUrl}, ${time}, CURRENT_DATE, ${uid})
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
 * Delete a meal (only if it belongs to this device)
 */
export async function removeMealFromDb(id) {
  const uid = getDeviceId();
  try {
    await sql`DELETE FROM meals WHERE id = ${id} AND user_id = ${uid};`;
    return true;
  } catch (err) {
    console.error('Error deleting meal from Neon:', err);
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   ACTIVITIES
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Fetch activities for today (this device only)
 */
export async function fetchActivities() {
  const uid = getDeviceId();
  try {
    const rows = await sql`
      SELECT id, name, calories, time, date
      FROM activities
      WHERE date = CURRENT_DATE AND user_id = ${uid}
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
 * Add an activity (tagged to this device)
 */
export async function insertActivity({ name, calories, time }) {
  const uid = getDeviceId();
  try {
    const rows = await sql`
      INSERT INTO activities (name, calories, time, date, user_id)
      VALUES (${name}, ${calories}, ${time}, CURRENT_DATE, ${uid})
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
 * Delete an activity (only if it belongs to this device)
 */
export async function removeActivityFromDb(id) {
  const uid = getDeviceId();
  try {
    await sql`DELETE FROM activities WHERE id = ${id} AND user_id = ${uid};`;
    return true;
  } catch (err) {
    console.error('Error deleting activity from Neon:', err);
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   DAILY STATS  (water, reminders)
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Fetch daily stats (water intake and reminder preferences) for this device
 */
export async function fetchDailyStats() {
  const uid = getDeviceId();
  try {
    const rows = await sql`
      SELECT date, water, reminder_interval, reminder_enabled
      FROM daily_stats
      WHERE date = CURRENT_DATE AND user_id = ${uid};
    `;
    if (rows.length > 0) {
      return {
        water: Number(rows[0].water) || 0,
        reminderInterval: Number(rows[0].reminder_interval) || 90,
        reminderEnabled: rows[0].reminder_enabled ?? true,
      };
    }
    // Insert default row for today for this device
    await sql`
      INSERT INTO daily_stats (date, water, reminder_interval, reminder_enabled, user_id)
      VALUES (CURRENT_DATE, 0, 90, true, ${uid})
      ON CONFLICT (user_id, date) DO NOTHING;
    `;
    return { water: 0, reminderInterval: 90, reminderEnabled: true };
  } catch (err) {
    console.error('Error fetching daily stats from Neon:', err);
    throw err;
  }
}

/**
 * Update water intake for today (this device)
 */
export async function saveWaterIntake(water) {
  const uid = getDeviceId();
  try {
    await sql`
      INSERT INTO daily_stats (date, water, updated_at, user_id)
      VALUES (CURRENT_DATE, ${water}, CURRENT_TIMESTAMP, ${uid})
      ON CONFLICT (user_id, date)
      DO UPDATE SET water = ${water}, updated_at = CURRENT_TIMESTAMP;
    `;
    return water;
  } catch (err) {
    console.error('Error saving water intake to Neon:', err);
    throw err;
  }
}

/**
 * Update reminder preferences (this device)
 */
export async function saveReminderSettings({ enabled, interval }) {
  const uid = getDeviceId();
  try {
    await sql`
      INSERT INTO daily_stats (date, reminder_enabled, reminder_interval, updated_at, user_id)
      VALUES (CURRENT_DATE, ${enabled}, ${interval}, CURRENT_TIMESTAMP, ${uid})
      ON CONFLICT (user_id, date)
      DO UPDATE SET reminder_enabled = ${enabled}, reminder_interval = ${interval}, updated_at = CURRENT_TIMESTAMP;
    `;
    return true;
  } catch (err) {
    console.error('Error saving reminder settings to Neon:', err);
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   USER GOALS
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Fetch persistent user goals for this device
 */
export async function fetchUserGoals() {
  const uid = getDeviceId();
  try {
    const rows = await sql`
      SELECT calories, protein, carbs, fat, fiber, water
      FROM user_goals
      WHERE user_id = ${uid};
    `;
    if (rows.length > 0) {
      return {
        calories: Number(rows[0].calories) || 2200,
        protein: Number(rows[0].protein) || 150,
        carbs: Number(rows[0].carbs) || 220,
        fat: Number(rows[0].fat) || 70,
        fiber: Number(rows[0].fiber) || 30,
        water: Number(rows[0].water) || 2500,
      };
    }
    return { calories: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30, water: 2500 };
  } catch (err) {
    console.error('Error fetching user goals from Neon:', err);
    return { calories: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30, water: 2500 };
  }
}

/**
 * Save user goals (this device)
 */
export async function saveUserGoals({ calories, protein, carbs, fat, fiber = 30, water = 2500 }) {
  const uid = getDeviceId();
  try {
    await sql`
      INSERT INTO user_goals (user_id, calories, protein, carbs, fat, fiber, water, updated_at)
      VALUES (${uid}, ${calories}, ${protein}, ${carbs}, ${fat}, ${fiber}, ${water}, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
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

/* ─────────────────────────────────────────────────────────────────────────
   FAVORITES
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Fetch favorite meals for this device
 */
export async function fetchFavorites() {
  const uid = getDeviceId();
  try {
    const rows = await sql`
      SELECT id, name, calories, 
             COALESCE(protein, 0)::numeric as protein, 
             COALESCE(carbs, 0)::numeric as carbs, 
             COALESCE(fat, 0)::numeric as fat, 
             COALESCE(fiber, 0)::numeric as fiber
      FROM favorites
      WHERE user_id = ${uid}
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
 * Insert a meal into favorites (this device)
 */
export async function insertFavorite({ name, calories, protein = 0, carbs = 0, fat = 0, fiber = 0 }) {
  const uid = getDeviceId();
  try {
    const rows = await sql`
      INSERT INTO favorites (name, calories, protein, carbs, fat, fiber, user_id)
      VALUES (${name}, ${calories}, ${protein}, ${carbs}, ${fat}, ${fiber}, ${uid})
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
 * Delete a favorite meal (this device only)
 */
export async function removeFavorite(id) {
  const uid = getDeviceId();
  try {
    await sql`DELETE FROM favorites WHERE id = ${id} AND user_id = ${uid};`;
    return true;
  } catch (err) {
    console.error('Error deleting favorite from Neon:', err);
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   HISTORY (30-day macro trends, this device only)
   ───────────────────────────────────────────────────────────────────────── */

export async function fetchPastHistoryFromDb() {
  const uid = getDeviceId();
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
        WHERE date >= CURRENT_DATE - INTERVAL '30 days' AND user_id = ${uid}
        GROUP BY date;
      `,
      sql`
        SELECT 
          date::text as date_str,
          COALESCE(SUM(calories), 0)::int as burn
        FROM activities
        WHERE date >= CURRENT_DATE - INTERVAL '30 days' AND user_id = ${uid}
        GROUP BY date;
      `,
      sql`
        SELECT 
          date::text as date_str,
          water
        FROM daily_stats
        WHERE date >= CURRENT_DATE - INTERVAL '30 days' AND user_id = ${uid};
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

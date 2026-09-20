export const GEMINI_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) 
  ? import.meta.env.VITE_GEMINI_API_KEY 
  : ((typeof process !== 'undefined' && process.env && (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY)) || (typeof localStorage !== 'undefined' && localStorage.getItem('jazz_gemini_api_key')) || '');

const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash'
];

/**
 * Helper to call Gemini API with model fallback
 */
async function callGemini(contents, generationConfig = {}) {
  let lastError = null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents,
          generationConfig,
        }),
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      }

      const errText = await res.text();
      console.warn(`Gemini model ${model} failed with ${res.status}:`, errText);
      lastError = new Error(`Gemini status ${res.status}: ${errText}`);
    } catch (err) {
      console.warn(`Gemini model ${model} request error:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Analyze an uploaded food photo using Gemini Vision
 */
export async function analyzeFoodImage(base64Data, mimeType = 'image/jpeg') {
  // Strip data URL prefix if present
  const rawBase64 = base64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

  const prompt = `You are an expert nutritionist and vision model.
Analyze this meal photo carefully. Identify every distinct food item on the plate, bowl, or container.
Estimate reasonable portion sizes, calories, and macronutrient breakdowns in grams.

Return ONLY a valid JSON array of objects with no markdown code fences and no extra text.
Each object MUST have this schema:
[
  {
    "name": "Food item name (e.g. Grilled Chicken Breast)",
    "qty": 150,
    "unit": "g",
    "calories": 248,
    "protein": 46,
    "carbs": 0,
    "fat": 5.4,
    "fiber": 0
  }
]
If the photo does not clearly contain food, return an empty array [].`;

  const contents = [
    {
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: rawBase64,
          },
        },
      ],
    },
  ];

  const text = await callGemini(contents, {
    response_mime_type: 'application/json',
    temperature: 0.2,
  });

  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse Gemini vision JSON:', text, err);
    return [];
  }
}

/**
 * Parse natural language spoken or typed meal descriptions into structured items
 */
export async function parseSpokenMeal(transcript) {
  const prompt = `You are an expert nutritionist and meal analyzer.
The user spoke or typed this description of what they ate:
"${transcript}"

Break this down into each distinct food or beverage item mentioned.
Estimate reasonable quantities in grams or units, calories, and macronutrient breakdowns in grams.

Return ONLY a valid JSON array of objects with no markdown code fences and no extra text.
Schema:
[
  {
    "name": "Food item name (e.g. Scrambled Eggs)",
    "qty": 2,
    "unit": "large",
    "calories": 140,
    "protein": 12,
    "carbs": 1,
    "fat": 10,
    "fiber": 0
  }
]
If the input does not describe any food or drink, return [].`;

  const contents = [
    {
      parts: [{ text: prompt }],
    },
  ];

  const text = await callGemini(contents, {
    response_mime_type: 'application/json',
    temperature: 0.2,
  });

  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse Gemini spoken meal JSON:', text, err);
    return [];
  }
}

/**
 * Generate real-time AI Dietitian Chat advice
 */
export async function askDietitian(userMessage, remaining, totals, meals = [], goals = { calories: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30 }) {
  const mealSummary = meals.length > 0 
    ? meals.map(m => `${m.name} (${m.calories} kcal, P:${m.protein}g, C:${m.carbs}g, F:${m.fat}g)`).join(', ')
    : 'Nothing logged yet today';

  const systemContext = `You are JazzCoach AI, the elite personal macro and fitness dietitian for the JazzMacros app.
Your tone is encouraging, razor-sharp, energetic, and highly actionable. You are deeply knowledgeable about Indian foods (paneer, dal, roti, soya chunks, biryani, chaas, chana), Asian cuisine, and global fitness diets.

Today's Live Status for this user:
- Daily Targets: ${goals.calories} kcal (Protein: ${goals.protein}g | Carbs: ${goals.carbs}g | Fat: ${goals.fat}g | Fiber: ${goals.fiber || 30}g)
- Consumed so far: ${totals.calories} kcal (Protein: ${totals.protein}g, Carbs: ${totals.carbs}g, Fat: ${totals.fat}g)
- Logged items: ${mealSummary}
- Remaining to hit goal: ${remaining.calories} kcal | ${remaining.protein}g Protein | ${remaining.carbs}g Carbs | ${remaining.fat}g Fat

User question: "${userMessage}"

Coaching Directives:
1. Always calculate the user's exact math: state whether the food fits their remaining budget and specify exact grams/calories remaining.
2. Give concrete meal recommendations or smart swaps (e.g. adding 150g grilled chicken, 100g paneer tikka, 3 boiled egg whites, soya chunks curry, or a whey scoop).
3. If they ask about eating treats (e.g. pizza, biryani, burger, samosa), tell them how to fit it within their numbers or compensate with protein.
4. Keep the answer punchy, organized, and under 3-4 concise sentences.
5. FORMATTING RULES:
   - Output clean, polished, direct sentences.
   - DO NOT clutter the text with nested asterisks like '* **' or excessive bold markers.
   - Use clean newlines between distinct points.`;

  const contents = [
    {
      parts: [{ text: systemContext }],
    },
  ];

  const raw = await callGemini(contents, {
    temperature: 0.7,
    maxOutputTokens: 500,
  });

  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/([^\n])\s*\*\s+\*\*/g, '$1\n\n• **')
    .replace(/([^\n])\s*•\s+\*\*/g, '$1\n\n• **')
    .trim();
}

/**
 * Generate personalized daily recommendation based on current remaining macros
 */
export async function getDailyRecommendation(remaining, totals) {
  const prompt = `You are JazzCoach AI, the high-performance macro coach for JazzMacros.
The user's real-time nutrition balance today:
- Eaten: ${totals.calories} kcal (${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fat}g fat).
- Remaining: ${remaining.calories} kcal, ${remaining.protein}g protein, ${remaining.carbs}g carbs, ${remaining.fat}g fat.

Provide an energetic, motivating 1-2 sentence recommendation for what meal, snack, or drink they should prioritize next (mention specific Indian foods like grilled chicken, paneer tikka, egg bhurji, dal khichdi, chaas, or sprouted moong to balance their remaining macros). Be punchy and direct.

CRITICAL FORMATTING INSTRUCTION:
DO NOT USE ANY ASTERISKS (**), DO NOT USE BOLD SYNTAX, AND DO NOT USE BULLET POINTS. OUTPUT 100% PURE NATURAL CONVERSATIONAL TEXT ONLY.`;

  const contents = [
    {
      parts: [{ text: prompt }],
    },
  ];

  try {
    const res = await callGemini(contents, {
      temperature: 0.6,
      maxOutputTokens: 160,
    });
    return res ? res.replace(/\*\*/g, '').replace(/\*/g, '').replace(/[_`]/g, '').trim() : null;
  } catch (err) {
    console.error('Failed to get recommendation from Gemini:', err);
    return null;
  }
}

/**
 * Identify a packaged food product and its exact macros from barcode GTIN using Gemini Flash
 */
export async function lookupProductByBarcodeAI(barcodeNumber) {
  const prompt = `You are an expert food and packaged goods nutrition database with deep knowledge of Indian, Asian, and global packaged food GTINs.

IMPORTANT GS1 PREFIX RULES (DO NOT get this wrong):
- Barcodes starting with 890 are VALID GS1 INDIA barcodes. Examples: Parle-G (8901719131219), Kurkure (8901058000134), Amul Butter (8901737000119). Do NOT treat these as dummy.
- Barcodes starting with 0 are US/Canada GTINs (e.g. Oreo, Doritos, Coca-Cola).
- Barcodes starting with 4 are German/European.
- Only treat purely sequential or obviously fake codes like 000000000000, 111111111111, 123456789012, 999999999999 as dummy.

The user scanned GTIN: "${barcodeNumber}".

Recognize popular Indian brands: Parle, Britannia, Amul, Nestle India, ITC, Haldiram's, Kurkure, Lay's India, Bingo, Sunfeast, Maggi, Munch, KitKat India, Cadbury India, Ferrero India, Epigamia, Danone.

If you can identify this as a real food product (or reasonably infer the product from your training knowledge), return ONLY a valid JSON object with NO markdown code fences:
{
  "found": true,
  "name": "Exact Product Name (e.g. Parle-G Original Gluco Biscuits)",
  "brand": "Brand Name (e.g. Parle)",
  "servingSize": "100g",
  "calories": 450,
  "protein": 6.7,
  "carbs": 76.2,
  "fat": 11.4,
  "fiber": 1.2,
  "country": "India",
  "category": "Biscuits & Cookies",
  "ingredients": "Wheat Flour, Sugar, Partially Hydrogenated Vegetable Oils, Invert Syrup, Leavening Agents, Salt, Milk Solids, Dough Conditioners"
}

If you truly cannot identify any known food product for this GTIN, return:
{
  "found": false,
  "message": "Unregistered or unknown barcode"
}`;

  const contents = [
    {
      parts: [{ text: prompt }],
    },
  ];

  try {
    const text = await callGemini(contents, {
      response_mime_type: 'application/json',
      temperature: 0.1,
    });
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini barcode lookup failed:', err);
    return null;
  }
}

/**
 * Second-pass estimation: ask Gemini to estimate nutrition for a product by name/brand inference from GTIN
 */
export async function estimateProductByBarcodeAI(barcodeNumber) {
  const prompt = `You are a nutrition database assistant.
The GTIN barcode "${barcodeNumber}" was scanned.

Even if you don't know the exact product, use the GS1 company prefix to infer the brand:
- 8901719 → Parle Products (India)
- 8901058 → PepsiCo India (Kurkure, Lay's)
- 8901737 → Amul (Gujarat Cooperative)
- 8901030 → Nestle India (Maggi, KitKat)
- 8901207 → Britannia Industries
- 8904109 → ITC (Sunfeast, Bingo)
- 8904279 → Haldiram's
- 000000004011 → Banana (generic PLU)

Based on the company prefix, estimate what type of product this is and provide REASONABLE nutritional values for a standard serving of that brand's typical product.

Return ONLY valid JSON with NO markdown:
{
  "found": true,
  "name": "Estimated product name based on brand inference",
  "brand": "Brand name",
  "servingSize": "serving size in g or ml",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "country": "India",
  "category": "category",
  "ingredients": "",
  "note": "Estimated — please verify with product label"
}`;

  const contents = [{ parts: [{ text: prompt }] }];

  try {
    const text = await callGemini(contents, {
      response_mime_type: 'application/json',
      temperature: 0.3,
    });
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini barcode estimation failed:', err);
    return null;
  }
}

/**
 * Analyze a photo of a food packaging or nutrition label using Gemini Flash
 */
export async function analyzeNutritionLabel(base64Image, mimeType = 'image/jpeg') {
  const rawBase64 = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

  const prompt = `You are an expert OCR nutrition label reader and food analyst.
Carefully examine this image of a food packaging, back label, or nutrition table.
Extract the exact product name, brand, serving size, calories, and macronutrient breakdowns in grams.

Return ONLY a valid JSON object with NO markdown code fences:
{
  "name": "Product Name (e.g. High Protein Greek Yogurt)",
  "brand": "Brand Name (e.g. Epigamia)",
  "servingSize": "100g",
  "calories": 95,
  "protein": 10,
  "carbs": 6,
  "fat": 3,
  "fiber": 0,
  "ingredients": "Pasteurized Cow Milk, Live Active Cultures"
}`;

  const contents = [
    {
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: rawBase64,
          },
        },
      ],
    },
  ];

  try {
    const text = await callGemini(contents, {
      response_mime_type: 'application/json',
      temperature: 0.2,
    });
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini nutrition label analysis failed:', err);
    return null;
  }
}

/**
 * Process recorded audio meal description with Gemini Flash
 */
export async function parseAudioMeal(base64Audio, mimeType = 'audio/webm') {
  const rawBase64 = base64Audio.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '');

  const prompt = `You are an expert nutritionist and voice transcriber.
Listen to this audio recording of a user describing what they ate or drank.
1. Transcribe the spoken text into English or natural terms.
2. Identify every distinct food or beverage item.
3. Estimate reasonable quantities in grams/pieces, calories, and macronutrient breakdowns.

Return ONLY a valid JSON object with NO markdown code fences:
{
  "transcript": "Transcribed spoken text here",
  "items": [
    {
      "name": "Food item (e.g. Scrambled Eggs)",
      "qty": 2,
      "unit": "large",
      "calories": 140,
      "protein": 12,
      "carbs": 1,
      "fat": 10,
      "fiber": 0
    }
  ]
}`;

  const contents = [
    {
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: rawBase64,
          },
        },
      ],
    },
  ];

  try {
    const text = await callGemini(contents, {
      response_mime_type: 'application/json',
      temperature: 0.2,
    });
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini audio parse failed:', err);
    return null;
  }
}

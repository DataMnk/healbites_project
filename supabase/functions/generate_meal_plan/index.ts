import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ──────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Prompt builder ─────────────────────────────────────────────────────────

function buildSystemPrompt(
  profile: Record<string, unknown>,
  tier: string
): string {
  const conditions =
    (profile.health_conditions as string[] | null)?.filter(
      (c) => c !== "None"
    ).join(", ") || "None";

  const intolerances =
    (profile.intolerances as string[] | null)?.filter(
      (c) => c !== "None"
    ).join(", ") || "None";

  const cuisines =
    (profile.cultural_preferences as string[] | null)?.join(", ") ||
    "No preference";

  const goalMap: Record<string, string> = {
    lose_weight: "Lose weight",
    maintain_weight: "Maintain weight",
    build_muscle: "Build muscle",
    manage_condition: "Manage a health condition",
    eat_healthier: "Eat healthier overall",
  };

  const activityMap: Record<string, string> = {
    sedentary: "Sedentary (little or no exercise)",
    light: "Light (1–3 days/week)",
    moderate: "Moderate (3–5 days/week)",
    high: "High (6–7 days/week)",
  };

  const goal = goalMap[profile.nutrition_goal as string] ?? (profile.nutrition_goal as string) ?? "General wellness";
  const activity = activityMap[profile.activity_level as string] ?? (profile.activity_level as string) ?? "Unknown";

  return `You are a clinical nutritionist AI for HealBites, a personalized nutrition platform.

PATIENT PROFILE:
- Name: ${profile.name || "Patient"}
- Age: ${profile.age} years old
- Sex: ${profile.sex}
- Height: ${profile.height_cm} cm | Weight: ${profile.weight_kg} kg
- Activity Level: ${activity}
- Health Conditions: ${conditions}
- Primary Goal: ${goal}
- Diet Type: ${profile.dietary_type || "No restrictions"}
- Food Intolerances/Allergies: ${intolerances}
- Disliked Foods: ${(profile.disliked_foods as string) || "None specified"}
- Preferred Cuisines: ${cuisines}
- Subscription Tier: ${tier}

YOUR TASK:
Generate a complete 7-day personalized meal plan for this patient. The plan must be medically informed, respecting their health conditions and goals.

STRICT REQUIREMENTS:
1. Return ONLY valid JSON — no markdown, no extra text, nothing outside the JSON object.
2. Include exactly 7 days: monday, tuesday, wednesday, thursday, friday, saturday, sunday.
3. Include exactly 5 meals per day with types (in this order): breakfast, snack_am, lunch, snack_pm, dinner.
4. Every ingredient MUST have "category" set to one of exactly: produce, proteins, grains_dairy, pantry.
5. NEVER include ingredients the patient is intolerant or allergic to.
6. NEVER include foods that violate the selected diet type.
7. NEVER include foods from the patient's disliked foods list.
8. Each "education_tip" per meal MUST directly reference the patient's specific health condition(s) or goal in a warm, friendly, encouraging tone. Example: "Salmon is rich in omega-3 fatty acids, which help reduce inflammation and support your cholesterol goals."
9. The "daily_tip" must be a unique, personalized insight relevant to this patient's conditions and goal.
10. Caloric targets should be clinically appropriate:
    - Weight loss: aim for 300–500 kcal deficit from estimated TDEE
    - Muscle building: slight surplus (~200–300 kcal above TDEE)
    - Maintenance: balanced around estimated TDEE
11. Vary meals across the 7 days — no repeated meal names.
12. Snacks should be light (150–300 kcal); main meals should be substantial (400–700 kcal).
13. Macros in daily_summary must equal the sum of all meal macros for that day.

EDUCATION TIPS TONE: Warm, positive, never alarmist. Like a friendly nutritionist explaining "why" this specific food benefits this specific patient. Always reference their actual conditions or goal.

RETURN THIS EXACT JSON STRUCTURE:
{
  "week_start": "YYYY-MM-DD",
  "daily_tip": "A unique personalized daily insight for this patient",
  "days": [
    {
      "day": "monday",
      "meals": [
        {
          "type": "breakfast",
          "name": "Descriptive Meal Name",
          "ingredients": [
            { "item": "ingredient name", "amount": "60g", "category": "grains_dairy" },
            { "item": "ingredient name", "amount": "80g", "category": "produce" }
          ],
          "calories": 380,
          "macros": { "protein": 12, "carbs": 52, "fat": 14 },
          "education_tip": "Personalized tip referencing patient conditions/goal"
        },
        { "type": "snack_am", ... },
        { "type": "lunch", ... },
        { "type": "snack_pm", ... },
        { "type": "dinner", ... }
      ],
      "daily_summary": {
        "total_calories": 1850,
        "macros": { "protein": 95, "carbs": 210, "fat": 62 }
      }
    }
  ]
}`;
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 0. Validate required secrets ──────────────────────────────────────
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse(
        { error: "OPENAI_API_KEY secret is not configured. Run: npx supabase secrets set OPENAI_API_KEY=sk-... --project-ref xlgmouhicypeanxhcqsf" },
        500
      );
    }

    // ── 1. Auth verification ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    // Extract the JWT and pass it explicitly to getUser().
    // Calling getUser() without an argument reads from in-memory session,
    // which is always empty in a freshly created edge-function client.
    const jwt = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(jwt);

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────
    const { user_id, week_start } = await req.json();

    if (!user_id || !week_start) {
      return jsonResponse({ error: "Missing user_id or week_start" }, 400);
    }

    // Security: user can only generate plans for themselves
    if (user_id !== user.id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // ── 3. Load profile + subscription (service role) ─────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [profileResult, subscriptionResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", user_id).single(),
      supabaseAdmin
        .from("subscriptions")
        .select("tier")
        .eq("user_id", user_id)
        .maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return jsonResponse({ error: "Profile not found" }, 404);
    }

    const profile = profileResult.data;
    const tier = subscriptionResult.data?.tier ?? "basic";

    // ── 4. Build prompt & call OpenAI ─────────────────────────────────────
    const systemPrompt = buildSystemPrompt(profile, tier);

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate the complete 7-day meal plan for week starting ${week_start}. Return only the JSON object.`,
            },
          ],
          max_tokens: 8000,
          temperature: 0.7,
        }),
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI error (${openaiRes.status}): ${errText}`);
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Empty response from OpenAI");
    }

    // ── 5. Parse & validate JSON ──────────────────────────────────────────
    let planJson: Record<string, unknown>;
    try {
      planJson = JSON.parse(rawContent);
    } catch {
      throw new Error("OpenAI returned invalid JSON");
    }

    if (!planJson.days || !Array.isArray(planJson.days)) {
      throw new Error("Plan is missing required 'days' array");
    }

    if ((planJson.days as unknown[]).length !== 7) {
      throw new Error(
        `Expected 7 days, got ${(planJson.days as unknown[]).length}`
      );
    }

    // Ensure week_start matches what was requested
    planJson.week_start = week_start;

    // ── 6. Store in database ──────────────────────────────────────────────
    const { data: savedPlan, error: saveError } = await supabaseAdmin
      .from("meal_plans")
      .insert({
        user_id,
        week_start,
        plan: planJson,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Database error: ${saveError.message}`);
    }

    return jsonResponse({ plan: savedPlan });
  } catch (error) {
    console.error("generate_meal_plan error:", error);
    return jsonResponse(
      { error: (error as Error).message ?? "Internal server error" },
      500
    );
  }
});

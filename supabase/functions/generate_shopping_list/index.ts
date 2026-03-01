import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ───────────────────────────────────────────────────────────────────

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

// ── Types ──────────────────────────────────────────────────────────────────

type Category = "produce" | "proteins" | "grains_dairy" | "pantry";

type Ingredient = {
  item: string;
  amount: string;
  category: Category;
};

type ConsolidatedItem = { item: string; amount: string };
type ShoppingList = Record<Category, ConsolidatedItem[]>;

// ── Helpers ────────────────────────────────────────────────────────────────

function consolidateAmounts(amounts: string[]): string {
  if (amounts.length === 1) return amounts[0];

  const parsed = amounts.map((a) => {
    const match = a.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
    return match
      ? { num: parseFloat(match[1]), unit: match[2].toLowerCase() }
      : null;
  });

  // Sum only when every amount has the same unit
  if (
    parsed.every((p) => p !== null) &&
    new Set(parsed.map((p) => p!.unit)).size === 1
  ) {
    const total = parsed.reduce((sum, p) => sum + p!.num, 0);
    return `${Math.round(total * 10) / 10}${parsed[0]!.unit}`;
  }

  return amounts.join(" + ");
}

const VALID_CATEGORIES = new Set<Category>([
  "produce",
  "proteins",
  "grains_dairy",
  "pantry",
]);

function buildShoppingList(planJson: Record<string, unknown>): ShoppingList {
  const days = (
    planJson.days as Array<{ meals: Array<{ ingredients: Ingredient[] }> }>
  ) ?? [];

  const buckets: Record<Category, Record<string, string[]>> = {
    produce: {},
    proteins: {},
    grains_dairy: {},
    pantry: {},
  };

  for (const day of days) {
    for (const meal of day.meals ?? []) {
      for (const ing of meal.ingredients ?? []) {
        const cat: Category = VALID_CATEGORIES.has(ing.category)
          ? ing.category
          : "pantry";
        const key = ing.item.toLowerCase().trim();
        if (!buckets[cat][key]) buckets[cat][key] = [];
        buckets[cat][key].push(ing.amount);
      }
    }
  }

  const toList = (bucket: Record<string, string[]>): ConsolidatedItem[] =>
    Object.entries(bucket)
      .map(([item, amounts]) => ({
        item: item.charAt(0).toUpperCase() + item.slice(1),
        amount: consolidateAmounts(amounts),
      }))
      .sort((a, b) => a.item.localeCompare(b.item));

  return {
    produce: toList(buckets.produce),
    proteins: toList(buckets.proteins),
    grains_dairy: toList(buckets.grains_dairy),
    pantry: toList(buckets.pantry),
  };
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Auth verification ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

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
    const { meal_plan_id } = await req.json();

    if (!meal_plan_id) {
      return jsonResponse({ error: "Missing meal_plan_id" }, 400);
    }

    // ── 3. Load data via service role ─────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [planResult, profileResult, subscriptionResult] = await Promise.all([
      supabaseAdmin
        .from("meal_plans")
        .select("*")
        .eq("id", meal_plan_id)
        .eq("user_id", user.id) // security: owner only
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("health_conditions, nutrition_goal, name")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("subscriptions")
        .select("tier")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (planResult.error || !planResult.data) {
      return jsonResponse({ error: "Meal plan not found" }, 404);
    }

    const planData = planResult.data;
    const profile = profileResult.data;
    const tier = subscriptionResult.data?.tier ?? "basic";

    // ── 4. Build shopping list (pure data transformation) ─────────────────
    const shopping_list = buildShoppingList(
      planData.plan as Record<string, unknown>
    );

    // ── 5. Premium: generate section education tips via OpenAI ────────────
    let section_tips: Record<string, string> | undefined;

    if (tier === "premium") {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        const conditions =
          (profile?.health_conditions as string[] | null)
            ?.filter((c) => c !== "None")
            .join(", ") || "general wellness";
        const goal = profile?.nutrition_goal ?? "eat healthier";

        const tipsPrompt = `You are a clinical nutritionist for HealBites.
Patient conditions: ${conditions}. Goal: ${goal}.

Write exactly 4 short education tips (2-3 sentences each), one per grocery section, explaining the health benefits of that food group specifically for this patient's conditions and goal. Warm, encouraging tone — like a friendly nutritionist.

Return ONLY valid JSON with exactly these keys:
{
  "produce": "tip about fruits/vegetables for this patient",
  "proteins": "tip about proteins for this patient",
  "grains_dairy": "tip about grains and dairy for this patient",
  "pantry": "tip about pantry items (oils, nuts, spices) for this patient"
}`;

        try {
          const tipsRes = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openaiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [{ role: "user", content: tipsPrompt }],
                max_tokens: 600,
                temperature: 0.7,
              }),
            }
          );

          if (tipsRes.ok) {
            const tipsData = await tipsRes.json();
            const rawTips = tipsData.choices?.[0]?.message?.content;
            if (rawTips) section_tips = JSON.parse(rawTips);
          }
        } catch {
          // Non-critical: tips generation failed, proceed without them
        }
      }
    }

    return jsonResponse({
      week_start: planData.week_start,
      shopping_list,
      section_tips,
      tier,
    });
  } catch (error) {
    console.error("generate_shopping_list error:", error);
    return jsonResponse(
      { error: (error as Error).message ?? "Internal server error" },
      500
    );
  }
});

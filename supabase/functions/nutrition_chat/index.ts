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

// ── Prompt builder ─────────────────────────────────────────────────────────

function buildSystemPrompt(
  profile: Record<string, unknown>,
  planData: Record<string, unknown> | null
): string {
  const conditions =
    (profile.health_conditions as string[] | null)
      ?.filter((c) => c !== "None")
      .join(", ") || "None";

  const intolerances =
    (profile.intolerances as string[] | null)
      ?.filter((c) => c !== "None")
      .join(", ") || "None";

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

  const goal =
    goalMap[profile.nutrition_goal as string] ??
    (profile.nutrition_goal as string) ??
    "General wellness";

  // Build a compact meal plan summary (meal names only, not full ingredients)
  let mealPlanSummary = "No active meal plan.";
  if (planData?.days && Array.isArray(planData.days)) {
    const lines = (
      planData.days as Array<{
        day: string;
        meals: Array<{ type: string; name: string }>;
      }>
    ).map((d) => {
      const meals = d.meals
        .map((m) => `${m.type}: ${m.name}`)
        .join(", ");
      return `  ${d.day.charAt(0).toUpperCase() + d.day.slice(1)}: ${meals}`;
    });
    mealPlanSummary = `Week of ${planData.week_start as string}:\n${lines.join("\n")}`;
  }

  return `You are a friendly clinical nutrition assistant for HealBites, a personalized nutrition platform.

PATIENT PROFILE:
- Name: ${profile.name || "Patient"}
- Age: ${profile.age} | Sex: ${profile.sex}
- Height: ${profile.height_cm} cm | Weight: ${profile.weight_kg} kg
- Health Conditions: ${conditions}
- Primary Goal: ${goal}
- Diet Type: ${profile.dietary_type || "No restrictions"}
- Food Intolerances/Allergies: ${intolerances}
- Preferred Cuisines: ${cuisines}
- Disliked Foods: ${(profile.disliked_foods as string) || "None specified"}

ACTIVE MEAL PLAN:
${mealPlanSummary}

YOUR RULES:
1. ONLY answer questions about nutrition, meal planning, dietary health, and food choices. If asked about anything outside nutrition, say: "I'm your nutrition assistant — I can only help with food and dietary questions."
2. Always explain WHY in addition to WHAT. Personalize every answer to this patient's specific conditions and goal.
3. NEVER give medical diagnoses, recommend supplements, medications, or medical procedures.
4. NEVER claim to replace professional medical advice.
5. Be warm, encouraging, and educational — like a knowledgeable nutritionist who genuinely cares.
6. Keep responses concise (2–4 short paragraphs). Avoid excessive bullet lists.
7. When suggesting meal swaps, always verify the swap is safe given the patient's intolerances and dietary type.`;
}

// ── Main handler ───────────────────────────────────────────────────────────

const DAILY_LIMIT = 5;

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
    const { message, chat_session_id } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return jsonResponse({ error: "Message is required" }, 400);
    }

    // ── 3. Load profile, subscription, daily usage ────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    const [profileResult, subscriptionResult, usageResult] = await Promise.all(
      [
        supabaseAdmin.from("profiles").select("*").eq("id", user.id).single(),
        supabaseAdmin
          .from("subscriptions")
          .select("tier")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabaseAdmin
          .from("chat_usage")
          .select("message_count")
          .eq("user_id", user.id)
          .eq("message_date", today)
          .maybeSingle(),
      ]
    );

    const profile = profileResult.data as Record<string, unknown>;
    const tier = subscriptionResult.data?.tier ?? "basic";
    const currentCount = usageResult.data?.message_count ?? 0;

    // ── 4. Enforce daily limit for Basic users ────────────────────────────
    if (tier === "basic" && currentCount >= DAILY_LIMIT) {
      return jsonResponse(
        {
          error:
            "You've reached your daily message limit. Upgrade to Premium for unlimited chat.",
          messages_remaining: 0,
        },
        429
      );
    }

    // ── 5. Load most recent meal plan ─────────────────────────────────────
    const planResult = await supabaseAdmin
      .from("meal_plans")
      .select("plan, week_start")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planData = planResult.data
      ? ({
          ...(planResult.data.plan as Record<string, unknown>),
          week_start: planResult.data.week_start,
        } as Record<string, unknown>)
      : null;

    // ── 6. Load or create chat session ────────────────────────────────────
    type StoredMessage = { role: string; content: string; created_at: string };
    let sessionId: string = chat_session_id ?? "";
    let existingMessages: StoredMessage[] = [];

    if (sessionId) {
      const sessionResult = await supabaseAdmin
        .from("chat_sessions")
        .select("messages")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (sessionResult.data) {
        existingMessages =
          (sessionResult.data.messages as StoredMessage[]) ?? [];
      }
    } else {
      const newSession = await supabaseAdmin
        .from("chat_sessions")
        .insert({ user_id: user.id, messages: [] })
        .select("id")
        .single();

      if (newSession.error) {
        throw new Error(
          `Failed to create chat session: ${newSession.error.message}`
        );
      }
      sessionId = newSession.data.id;
    }

    // Use last 10 messages for context window
    const historyForContext = existingMessages.slice(-10);

    // ── 7. Call OpenAI ────────────────────────────────────────────────────
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "OpenAI is not configured." }, 500);
    }

    const systemPrompt = buildSystemPrompt(profile, planData);

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...historyForContext.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message.trim() },
    ];

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
          messages: openaiMessages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI error (${openaiRes.status}): ${errText}`);
    }

    const openaiData = await openaiRes.json();
    const assistantResponse: string =
      openaiData.choices?.[0]?.message?.content;

    if (!assistantResponse) {
      throw new Error("Empty response from OpenAI");
    }

    // ── 8. Persist messages + update usage ────────────────────────────────
    const now = new Date().toISOString();
    const updatedMessages: StoredMessage[] = [
      ...existingMessages,
      { role: "user", content: message.trim(), created_at: now },
      { role: "assistant", content: assistantResponse, created_at: now },
    ];

    const newCount = currentCount + 1;

    await Promise.all([
      supabaseAdmin
        .from("chat_sessions")
        .update({ messages: updatedMessages, updated_at: now })
        .eq("id", sessionId),
      usageResult.data
        ? supabaseAdmin
            .from("chat_usage")
            .update({ message_count: newCount })
            .eq("user_id", user.id)
            .eq("message_date", today)
        : supabaseAdmin
            .from("chat_usage")
            .insert({ user_id: user.id, message_date: today, message_count: 1 }),
    ]);

    return jsonResponse({
      response: assistantResponse,
      chat_session_id: sessionId,
      messages_remaining: tier === "basic" ? Math.max(0, DAILY_LIMIT - newCount) : null,
    });
  } catch (error) {
    console.error("nutrition_chat error:", error);
    return jsonResponse(
      { error: (error as Error).message ?? "Internal server error" },
      500
    );
  }
});

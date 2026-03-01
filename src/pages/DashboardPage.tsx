import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import supabase from "../supabase";

// ── Types ──────────────────────────────────────────────────────────────────

type Profile = {
  name: string | null;
  nutrition_goal: string | null;
  health_conditions: string[] | null;
  onboarding_complete: boolean;
};

type MealPlanRecord = {
  id: string;
  week_start: string;
  plan: { daily_tip?: string };
  created_at: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Lose weight",
  maintain_weight: "Maintain weight",
  build_muscle: "Build muscle",
  manage_condition: "Manage a condition",
  eat_healthier: "Eat healthier overall",
};

function getMondayDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

// ── Component ──────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestPlan, setLatestPlan] = useState<MealPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    if (!session) return;
    let mounted = true;

    Promise.all([
      supabase
        .from("profiles")
        .select("name, nutrition_goal, health_conditions, onboarding_complete")
        .eq("id", session.user.id)
        .single(),
      supabase
        .from("meal_plans")
        .select("id, week_start, plan, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([profileResult, planResult]) => {
      if (!mounted) return;

      if (!profileResult.data?.onboarding_complete) {
        navigate("/onboarding", { replace: true });
        return;
      }

      setProfile(profileResult.data);
      setLatestPlan(planResult.data as MealPlanRecord | null);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [session?.user.id]);

  const handleGenerate = async () => {
    if (!session) return;
    setGenerating(true);
    setGenerateError("");

    const { data, error } = await supabase.functions.invoke(
      "generate_meal_plan",
      {
        body: {
          user_id: session.user.id,
          week_start: getMondayDate(),
        },
      }
    );

    if (error || !data?.plan) {
      // FunctionsHttpError: actual edge-function body is in error.context
      const errMsg =
        (error as any)?.context?.error ||
        error?.message ||
        "Failed to generate your plan. Please try again.";
      setGenerateError(errMsg);
      setGenerating(false);
      return;
    }

    navigate("/meal-plan");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="app-loading">Loading your dashboard…</div>;
  }

  const firstName = profile?.name?.split(" ")[0] || "there";
  const goalLabel = profile?.nutrition_goal
    ? GOAL_LABELS[profile.nutrition_goal] ?? profile.nutrition_goal
    : null;
  const conditions = (profile?.health_conditions ?? []).filter(
    (c) => c !== "None"
  );

  const dailyTip = latestPlan?.plan?.daily_tip ?? null;

  return (
    <div className="app-page">
      <div className="dash-content">
        {/* ── Header ── */}
        <div className="dash-hero-card">
          <div className="dash-hero-bg-orb" />
          <div className="dash-hero-content">
            <div>
              <p className="dash-hero-eyebrow">🌿 HealBites</p>
              <h1 className="dash-greeting">Hi, {firstName}! 👋</h1>
              <p className="dash-summary">
                {goalLabel && (
                  <>
                    <span className="dash-pill">🎯 {goalLabel}</span>
                  </>
                )}
                {conditions.length > 0 && (
                  <>
                    <span className="dash-pill">⚕️ {conditions.join(", ")}</span>
                  </>
                )}
                {!goalLabel && conditions.length === 0 && "Welcome to HealBites!"}
              </p>
            </div>
            <button className="dash-signout-btn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>

        {/* ── Meal Plan section ── */}
        {generating ? (
          <div className="dash-generating-card">
            <div className="dash-generating-spinner">⟳</div>
            <h2>Creating your personalized plan…</h2>
            <p>
              Our AI nutritionist is building your 7-day meal plan based on
              your health profile. This takes about 30 seconds.
            </p>
            <div className="dash-generating-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : latestPlan ? (
          <div className="dash-active-plan-card">
            <span className="dash-active-plan-badge">✅ Active Plan</span>
            <h2>Your Meal Plan</h2>
            <p className="dash-active-plan-week">
              📅 Week of {formatWeekRange(latestPlan.week_start)}
            </p>
            <div className="dash-active-plan-actions">
              <Link to="/meal-plan" className="dash-view-plan-btn">
                View my plan →
              </Link>
              <button
                className="dash-regen-btn"
                onClick={handleGenerate}
                disabled={generating}
              >
                ↺ Regenerate
              </button>
            </div>
            {generateError && (
              <p className="dash-generate-error">{generateError}</p>
            )}
          </div>
        ) : (
          <div className="dash-cta-card">
            <h2>Generate your first meal plan</h2>
            <p>
              Get a personalized 7-day plan with breakfast, snacks, lunch, and
              dinner — built entirely around your health profile.
            </p>
            <button className="dash-cta-btn" onClick={handleGenerate}>
              ✨ Generate my plan
            </button>
            {generateError && (
              <p className="dash-generate-error-light">{generateError}</p>
            )}
          </div>
        )}

        {/* ── Quick access ── */}
        <p className="dash-section-title">Quick access</p>
        <div className="dash-quick-grid">
          {latestPlan ? (
            <Link
              to={`/shopping-list?plan=${latestPlan.id}`}
              className="dash-quick-card"
            >
              <span className="qc-icon">🛒</span>
              <span className="qc-label">Shopping List</span>
              <span className="qc-badge">View list →</span>
            </Link>
          ) : (
            <div className="dash-quick-card disabled">
              <span className="qc-icon">🛒</span>
              <span className="qc-label">Shopping List</span>
              <span className="qc-badge">Generate a plan first</span>
            </div>
          )}
          <Link to="/chat" className="dash-quick-card">
            <span className="qc-icon">💬</span>
            <span className="qc-label">Nutrition Chat</span>
            <span className="qc-badge">Ask your nutritionist →</span>
          </Link>
          <Link to="/onboarding" className="dash-quick-card">
            <span className="qc-icon">👤</span>
            <span className="qc-label">Edit Profile</span>
            <span className="qc-badge">Update your info</span>
          </Link>
        </div>

        {/* ── Daily tip ── */}
        <div className="dash-tip-card">
          <span className="dash-tip-icon">🎓</span>
          <div>
            <p className="dash-tip-label">Daily Tip</p>
            <p className="dash-tip-text">
              {dailyTip ??
                "Your personalized tips will appear here once you generate a meal plan."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

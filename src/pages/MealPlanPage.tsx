import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import supabase from "../supabase";

// ── Types ──────────────────────────────────────────────────────────────────

type Macros = { protein: number; carbs: number; fat: number };

type Ingredient = {
  item: string;
  amount: string;
  category: "produce" | "proteins" | "grains_dairy" | "pantry";
};

type Meal = {
  type: string;
  name: string;
  ingredients: Ingredient[];
  calories: number;
  macros: Macros;
  education_tip: string;
};

type DayPlan = {
  day: string;
  meals: Meal[];
  daily_summary: { total_calories: number; macros: Macros };
};

type PlanData = {
  week_start: string;
  daily_tip: string;
  days: DayPlan[];
};

type MealPlanRecord = {
  id: string;
  week_start: string;
  plan: PlanData;
  created_at: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🍳",
  snack_am: "🍎",
  lunch: "🥗",
  snack_pm: "🥜",
  dinner: "🍽️",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  snack_am: "AM Snack",
  lunch: "Lunch",
  snack_pm: "PM Snack",
  dinner: "Dinner",
};

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const year = end.getFullYear();
  return `${fmt(start)} – ${fmt(end)}, ${year}`;
}

// ── Component ──────────────────────────────────────────────────────────────

const MealPlanPage = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  const [mealPlan, setMealPlan] = useState<MealPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session) return;
    let mounted = true;

    supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        if (!data) {
          navigate("/dashboard", { replace: true });
          return;
        }
        setMealPlan(data as MealPlanRecord);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session?.user.id]);

  const toggleMeal = (key: string) => {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="app-loading">Loading your meal plan…</div>;
  }

  if (!mealPlan) return null;

  const planData = mealPlan.plan;

  // Sort days according to the canonical order
  const sortedDays = DAY_KEYS.map((key) =>
    planData.days.find((d) => d.day.toLowerCase() === key)
  ).filter(Boolean) as DayPlan[];

  const currentDay = sortedDays[activeDay];

  return (
    <div className="app-page mp-page">
      {/* ── Header ── */}
      <div className="mp-header">
        <Link to="/dashboard" className="mp-back-link">
          ← Dashboard
        </Link>
        <div className="mp-title-row">
          <div>
            <h1 className="mp-title">Your Meal Plan</h1>
            <p className="mp-week-label">
              📅 Week of {formatWeekRange(mealPlan.week_start)}
            </p>
          </div>
        </div>

        {/* Daily tip */}
        {planData.daily_tip && (
          <div className="mp-daily-tip">
            <span className="mp-tip-icon">🎓</span>
            <div>
              <p className="mp-tip-label">Daily Tip</p>
              <p className="mp-tip-text">{planData.daily_tip}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Day tabs ── */}
      <div className="mp-day-tabs-wrap">
        <div className="mp-day-tabs">
          {DAY_SHORT.map((label, i) => (
            <button
              key={label}
              className={`mp-day-tab${activeDay === i ? " active" : ""}`}
              onClick={() => {
                setActiveDay(i);
                setExpandedMeals(new Set());
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Meals ── */}
      {currentDay ? (
        <div className="mp-meals-container">
          <div className="mp-meals-list">
            {currentDay.meals.map((meal, mi) => {
              const key = `${activeDay}-${mi}`;
              const isOpen = expandedMeals.has(key);
              return (
                <div key={key} className="mp-meal-card">
                  {/* Clickable header */}
                  <button
                    className="mp-meal-header"
                    onClick={() => toggleMeal(key)}
                  >
                    <div className="mp-meal-header-left">
                      <span className="mp-meal-type-icon">
                        {MEAL_ICONS[meal.type] ?? "🍴"}
                      </span>
                      <div>
                        <p className="mp-meal-type-label">
                          {MEAL_LABELS[meal.type] ?? meal.type}
                        </p>
                        <p className="mp-meal-name">{meal.name}</p>
                      </div>
                    </div>
                    <div className="mp-meal-header-right">
                      <span className="mp-meal-calories">{meal.calories} kcal</span>
                      <span className="mp-meal-chevron">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div className="mp-meal-body">
                      {/* Macros row */}
                      <div className="mp-macros-row">
                        <span className="mp-macro-badge mp-macro-protein">
                          <span className="mp-macro-val">{meal.macros.protein}g</span>
                          <span className="mp-macro-lbl">protein</span>
                        </span>
                        <span className="mp-macro-badge mp-macro-carbs">
                          <span className="mp-macro-val">{meal.macros.carbs}g</span>
                          <span className="mp-macro-lbl">carbs</span>
                        </span>
                        <span className="mp-macro-badge mp-macro-fat">
                          <span className="mp-macro-val">{meal.macros.fat}g</span>
                          <span className="mp-macro-lbl">fat</span>
                        </span>
                      </div>

                      {/* Ingredients */}
                      <p className="mp-ingredients-title">Ingredients</p>
                      <ul className="mp-ingredients">
                        {meal.ingredients.map((ing, ii) => (
                          <li key={ii} className="mp-ingredient">
                            <span className="mp-ingredient-amount">
                              {ing.amount}
                            </span>
                            <span className="mp-ingredient-item">{ing.item}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Education tip */}
                      {meal.education_tip && (
                        <div className="mp-edu-tip">
                          <span className="mp-edu-icon">🎓</span>
                          <p>{meal.education_tip}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Daily summary */}
          {currentDay.daily_summary && (
            <div className="mp-day-summary">
              <p className="mp-day-summary-title">
                {DAY_SHORT[activeDay]} Daily Total
              </p>
              <p className="mp-day-summary-calories">
                {currentDay.daily_summary.total_calories.toLocaleString()} kcal
              </p>
              <p className="mp-day-summary-macros">
                <span>
                  <strong>{currentDay.daily_summary.macros.protein}g</strong>{" "}
                  protein
                </span>
                <span className="mp-macro-dot">·</span>
                <span>
                  <strong>{currentDay.daily_summary.macros.carbs}g</strong>{" "}
                  carbs
                </span>
                <span className="mp-macro-dot">·</span>
                <span>
                  <strong>{currentDay.daily_summary.macros.fat}g</strong> fat
                </span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mp-no-day">
          <p>No data available for this day.</p>
        </div>
      )}
    </div>
  );
};

export default MealPlanPage;

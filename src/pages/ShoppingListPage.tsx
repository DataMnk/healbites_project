import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import supabase from "../supabase";

// ── Types ──────────────────────────────────────────────────────────────────

type ConsolidatedItem = { item: string; amount: string };

type ShoppingList = {
  produce: ConsolidatedItem[];
  proteins: ConsolidatedItem[];
  grains_dairy: ConsolidatedItem[];
  pantry: ConsolidatedItem[];
};

type ShoppingListData = {
  week_start: string;
  shopping_list: ShoppingList;
  section_tips?: Record<string, string>;
  tier: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: "produce" as const,
    icon: "🥬",
    label: "Produce",
    sub: "Fruits, vegetables, herbs",
  },
  {
    key: "proteins" as const,
    icon: "🥩",
    label: "Proteins",
    sub: "Meats, poultry, fish, seafood, eggs, tofu",
  },
  {
    key: "grains_dairy" as const,
    icon: "🌾",
    label: "Grains & Dairy",
    sub: "Cereals, bread, pasta, rice, legumes, milk, cheese, yogurt",
  },
  {
    key: "pantry" as const,
    icon: "🥫",
    label: "Pantry",
    sub: "Oils, condiments, spices, canned goods, nuts, seeds",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

// ── Component ──────────────────────────────────────────────────────────────

const ShoppingListPage = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mealPlanId = searchParams.get("plan");

  const [data, setData] = useState<ShoppingListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session) return;
    if (!mealPlanId) {
      navigate("/dashboard", { replace: true });
      return;
    }

    let mounted = true;

    supabase.functions
      .invoke("generate_shopping_list", {
        body: { meal_plan_id: mealPlanId },
      })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data?.shopping_list) {
          setError(
            (error as any)?.context?.error ||
              error?.message ||
              "Failed to load shopping list."
          );
          setLoading(false);
          return;
        }
        setData(data as ShoppingListData);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session?.user.id, mealPlanId]);

  const toggleCheck = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="app-loading">Building your shopping list…</div>;
  }

  if (error) {
    return (
      <div className="app-page">
        <div className="sl-container">
          <Link to="/dashboard" className="sl-back-link">
            ← Dashboard
          </Link>
          <p className="sl-error">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { shopping_list, section_tips, tier, week_start } = data;
  const isPremium = tier === "premium";

  const totalItems = SECTIONS.reduce(
    (sum, s) => sum + (shopping_list[s.key]?.length ?? 0),
    0
  );
  const checkedCount = checked.size;

  return (
    <div className="app-page sl-page">
      {/* ── Header ── */}
      <div className="sl-header">
        <Link to="/dashboard" className="sl-back-link">
          ← Dashboard
        </Link>
        <div className="sl-title-row">
          <div>
            <h1 className="sl-title">Shopping List</h1>
            <p className="sl-week">📅 Week of {formatWeekRange(week_start)}</p>
          </div>
          <div className="sl-progress-badge">
            <span className="sl-progress-count">
              {checkedCount}/{totalItems}
            </span>
            <span className="sl-progress-label">items</span>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="sl-sections">
        {SECTIONS.map(({ key, icon, label, sub }) => {
          const items = shopping_list[key] ?? [];
          if (items.length === 0) return null;
          const tip = section_tips?.[key];

          return (
            <div key={key} className="sl-section">
              {/* Section header */}
              <div className="sl-section-header">
                <span className="sl-section-icon">{icon}</span>
                <div>
                  <p className="sl-section-label">{label}</p>
                  <p className="sl-section-sub">{sub}</p>
                </div>
                <span className="sl-section-count">{items.length}</span>
              </div>

              {/* Premium education tip */}
              {isPremium && tip && (
                <div className="sl-edu-tip">
                  <span className="sl-edu-icon">🎓</span>
                  <p>{tip}</p>
                </div>
              )}

              {/* Ingredient list */}
              <ul className="sl-items">
                {items.map((item, i) => {
                  const ck = `${key}-${i}`;
                  const isChecked = checked.has(ck);
                  return (
                    <li
                      key={ck}
                      className={`sl-item${isChecked ? " sl-item-checked" : ""}`}
                      onClick={() => toggleCheck(ck)}
                    >
                      <span
                        className={`sl-checkbox${isChecked ? " sl-checkbox-checked" : ""}`}
                      >
                        {isChecked ? "✓" : ""}
                      </span>
                      <span className="sl-item-name">{item.item}</span>
                      <span className="sl-item-amount">{item.amount}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShoppingListPage;

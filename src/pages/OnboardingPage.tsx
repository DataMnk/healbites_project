import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import supabase from "../supabase";

// ── Constants ──────────────────────────────────────────────────────────────

const ACTIVITY_LEVELS = [
  { value: "sedentary", icon: "🧘", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", icon: "🚶", label: "Light", desc: "1–3 days / week" },
  { value: "moderate", icon: "🏃", label: "Moderate", desc: "3–5 days / week" },
  { value: "high", icon: "⚡", label: "High", desc: "6–7 days / week" },
];

const HEALTH_CONDITIONS = [
  "Prediabetes",
  "Type 2 diabetes",
  "High cholesterol (LDL)",
  "Hypertension",
  "Gastritis",
  "Kidney disease",
  "Metabolic syndrome",
  "None",
  "Other",
];

const GOALS = [
  { value: "lose_weight", label: "Lose weight", icon: "⚖️" },
  { value: "maintain_weight", label: "Maintain weight", icon: "🎯" },
  { value: "build_muscle", label: "Build muscle", icon: "💪" },
  { value: "manage_condition", label: "Manage a condition", icon: "🩺" },
  { value: "eat_healthier", label: "Eat healthier overall", icon: "🥗" },
];

const DIET_TYPES = [
  { value: "none", label: "No restrictions", icon: "🍽️" },
  { value: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { value: "vegan", label: "Vegan", icon: "🌱" },
  { value: "pescatarian", label: "Pescatarian", icon: "🐟" },
  { value: "keto", label: "Keto", icon: "🥑" },
  { value: "mediterranean", label: "Mediterranean", icon: "🫒" },
];

const INTOLERANCES = ["Lactose", "Gluten", "Tree nuts", "Shellfish", "Egg", "Soy", "None"];

const CUISINES = [
  "Mexican",
  "Mediterranean",
  "Italian",
  "Asian",
  "Colombian",
  "Peruvian",
  "American",
  "Caribbean",
  "Indian",
  "Middle Eastern",
  "Other",
];

const STEP_TITLES = [
  "Tell us about yourself",
  "Your health",
  "Your food preferences",
  "Your food culture",
];

// ── Types ──────────────────────────────────────────────────────────────────

type StepNum = 1 | 2 | 3 | 4;

interface FormData {
  name: string;
  age: string;
  sex: string;
  height_cm: string;
  weight_kg: string;
  activity_level: string;
  health_conditions: string[];
  other_condition: string;
  nutrition_goal: string;
  dietary_type: string;
  intolerances: string[];
  disliked_foods: string;
  cultural_preferences: string[];
}

const INITIAL_FORM: FormData = {
  name: "",
  age: "",
  sex: "",
  height_cm: "",
  weight_kg: "",
  activity_level: "",
  health_conditions: [],
  other_condition: "",
  nutrition_goal: "",
  dietary_type: "",
  intolerances: [],
  disliked_foods: "",
  cultural_preferences: [],
};

// ── Helpers ────────────────────────────────────────────────────────────────

// Toggle a chip value; "None" is exclusive (selecting it clears others; selecting others clears it)
const toggleChip = (arr: string[], val: string, noneLabel: string): string[] => {
  if (val === noneLabel) {
    return arr.includes(noneLabel) ? [] : [noneLabel];
  }
  const withoutNone = arr.filter((v) => v !== noneLabel);
  return withoutNone.includes(val)
    ? withoutNone.filter((v) => v !== val)
    : [...withoutNone, val];
};

// ── Component ──────────────────────────────────────────────────────────────

const OnboardingPage = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  const [step, setStep] = useState<StepNum>(1);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing profile on mount; redirect if already complete
  useEffect(() => {
    if (!session) return;
    let mounted = true;

    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.onboarding_complete) {
          navigate("/dashboard", { replace: true });
          return;
        }
        if (data) {
          setForm({
            name: data.name || "",
            age: data.age?.toString() || "",
            sex: data.sex || "",
            height_cm: data.height_cm?.toString() || "",
            weight_kg: data.weight_kg?.toString() || "",
            activity_level: data.activity_level || "",
            health_conditions: data.health_conditions || [],
            other_condition: "",
            nutrition_goal: data.nutrition_goal || "",
            dietary_type: data.dietary_type || "",
            intolerances: data.intolerances || [],
            disliked_foods: data.disliked_foods || "",
            cultural_preferences: data.cultural_preferences || [],
          });
        }
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session?.user.id]);

  const set = (key: keyof FormData, value: string | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Validation ───────────────────────────────────────────────────────────

  const validate = (): string => {
    if (step === 1) {
      if (!form.name.trim()) return "Please enter your name.";
      const age = Number(form.age);
      if (!form.age || age < 1 || age > 120) return "Please enter a valid age (1–120).";
      if (!form.sex) return "Please select your sex.";
      const h = Number(form.height_cm);
      if (!form.height_cm || h < 50 || h > 280) return "Please enter a valid height in cm.";
      const w = Number(form.weight_kg);
      if (!form.weight_kg || w < 10 || w > 500) return "Please enter a valid weight in kg.";
      if (!form.activity_level) return "Please select your activity level.";
    }
    if (step === 2) {
      if (form.health_conditions.length === 0)
        return "Please select at least one option (or 'None').";
      if (!form.nutrition_goal) return "Please select your primary goal.";
    }
    if (step === 3) {
      if (!form.dietary_type) return "Please select your diet type.";
      if (form.intolerances.length === 0)
        return "Please select at least one option (or 'None').";
    }
    return "";
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!session) return;
    setSaving(true);

    // Resolve "Other" condition: replace the chip with the typed text
    let conditions = [...form.health_conditions];
    if (conditions.includes("Other")) {
      conditions = conditions.filter((c) => c !== "Other");
      if (form.other_condition.trim()) {
        conditions.push(form.other_condition.trim());
      }
    }

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: session.user.id,
      name: form.name.trim(),
      age: parseInt(form.age),
      sex: form.sex,
      height_cm: parseInt(form.height_cm),
      weight_kg: parseFloat(form.weight_kg),
      activity_level: form.activity_level,
      health_conditions: conditions,
      nutrition_goal: form.nutrition_goal,
      dietary_type: form.dietary_type,
      intolerances: form.intolerances,
      disliked_foods: form.disliked_foods.trim(),
      cultural_preferences: form.cultural_preferences,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (saveError) {
      setError(`Error saving profile: ${saveError.message}`);
      return;
    }

    setDone(true);
  };

  // ── Navigation ───────────────────────────────────────────────────────────

  const handleNext = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");

    if (step < 4) {
      setStep((s) => (s + 1) as StepNum);
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 1) setStep((s) => (s - 1) as StepNum);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="app-loading">Setting up your profile…</div>;
  }

  if (done) {
    return (
      <div className="app-page">
        <div className="ob-card ob-done">
          <span className="ob-done-emoji">🎉</span>
          <h1>Your profile is ready!</h1>
          <p>
            We have everything we need to create your personalized meal plan.
            <br />
            Let's get started!
          </p>
          <button
            className="ob-btn ob-btn-primary"
            onClick={() => navigate("/dashboard")}
          >
            Generate my first plan →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      {/* Branding */}
      <div className="ob-brand">
        <span className="ob-brand-icon">🌿</span>
        <span className="ob-brand-text">HealBites</span>
      </div>

      {/* Step indicator */}
      <div className="ob-progress-wrap">
        <div className="ob-step-indicator">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="ob-step-item">
              <div
                className={`ob-step-dot${s < step ? " ob-step-done" : s === step ? " ob-step-active" : ""}`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 4 && (
                <div className={`ob-step-line${s < step ? " ob-step-line-done" : ""}`} />
              )}
            </div>
          ))}
        </div>
        <p className="ob-step-label">{STEP_TITLES[step - 1]}</p>
        <div className="ob-progress-bar">
          <div className="ob-progress-fill" style={{ width: `${step * 25}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="ob-card">
        <h2 className="ob-title">{STEP_TITLES[step - 1]}</h2>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <p className="ob-subtitle">
              Basic information to personalize your experience.
            </p>

            <div className="ob-field">
              <label className="ob-label">Your name</label>
              <input
                className="ob-input"
                type="text"
                placeholder="e.g. Maria"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="ob-fields-row">
              <div className="ob-field">
                <label className="ob-label">Age</label>
                <input
                  className="ob-input"
                  type="number"
                  placeholder="e.g. 35"
                  min={1}
                  max={120}
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                />
              </div>
              <div className="ob-field">
                <label className="ob-label">Sex</label>
                <select
                  className="ob-select"
                  value={form.sex}
                  onChange={(e) => set("sex", e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="ob-fields-row">
              <div className="ob-field">
                <label className="ob-label">Height (cm)</label>
                <input
                  className="ob-input"
                  type="number"
                  placeholder="e.g. 165"
                  min={50}
                  max={280}
                  value={form.height_cm}
                  onChange={(e) => set("height_cm", e.target.value)}
                />
              </div>
              <div className="ob-field">
                <label className="ob-label">Weight (kg)</label>
                <input
                  className="ob-input"
                  type="number"
                  placeholder="e.g. 70"
                  min={10}
                  max={500}
                  value={form.weight_kg}
                  onChange={(e) => set("weight_kg", e.target.value)}
                />
              </div>
            </div>

            <div className="ob-field">
              <label className="ob-label">Physical activity level</label>
              <div className="ob-activity-grid">
                {ACTIVITY_LEVELS.map((a) => (
                  <div
                    key={a.value}
                    className={`ob-activity-card${
                      form.activity_level === a.value ? " selected" : ""
                    }`}
                    onClick={() => set("activity_level", a.value)}
                  >
                    <span className="ac-icon">{a.icon}</span>
                    <span className="ac-label">{a.label}</span>
                    <span className="ac-desc">{a.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <p className="ob-subtitle">
              This helps us tailor your meal plan to your health needs.
            </p>

            <div className="ob-field">
              <label className="ob-label">Health conditions</label>
              <div className="ob-chips">
                {HEALTH_CONDITIONS.map((c) => (
                  <span
                    key={c}
                    className={`ob-chip${
                      form.health_conditions.includes(c) ? " selected" : ""
                    }`}
                    onClick={() =>
                      set(
                        "health_conditions",
                        toggleChip(form.health_conditions, c, "None")
                      )
                    }
                  >
                    {c}
                  </span>
                ))}
              </div>
              {form.health_conditions.includes("Other") && (
                <input
                  className="ob-input"
                  type="text"
                  placeholder="Please specify your condition…"
                  value={form.other_condition}
                  onChange={(e) => set("other_condition", e.target.value)}
                  style={{ marginTop: "0.75rem" }}
                />
              )}
            </div>

            <div className="ob-field">
              <label className="ob-label">Primary goal</label>
              <div className="ob-option-list">
                {GOALS.map((g) => (
                  <div
                    key={g.value}
                    className={`ob-option-card${
                      form.nutrition_goal === g.value ? " selected" : ""
                    }`}
                    onClick={() => set("nutrition_goal", g.value)}
                  >
                    <span className="oc-icon">{g.icon}</span>
                    <span className="oc-label">{g.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <>
            <p className="ob-subtitle">Your dietary preferences and restrictions.</p>

            <div className="ob-field">
              <label className="ob-label">Diet type</label>
              <div className="ob-option-list">
                {DIET_TYPES.map((d) => (
                  <div
                    key={d.value}
                    className={`ob-option-card${
                      form.dietary_type === d.value ? " selected" : ""
                    }`}
                    onClick={() => set("dietary_type", d.value)}
                  >
                    <span className="oc-icon">{d.icon}</span>
                    <span className="oc-label">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ob-field">
              <label className="ob-label">Intolerances &amp; allergies</label>
              <div className="ob-chips">
                {INTOLERANCES.map((i) => (
                  <span
                    key={i}
                    className={`ob-chip${
                      form.intolerances.includes(i) ? " selected" : ""
                    }`}
                    onClick={() =>
                      set("intolerances", toggleChip(form.intolerances, i, "None"))
                    }
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>

            <div className="ob-field">
              <label className="ob-label">
                Foods you dislike{" "}
                <span className="ob-label-note">(optional)</span>
              </label>
              <textarea
                className="ob-textarea"
                placeholder="e.g. Brussels sprouts, liver, raw onion…"
                value={form.disliked_foods}
                onChange={(e) => set("disliked_foods", e.target.value)}
              />
            </div>
          </>
        )}

        {/* ── Step 4 ── */}
        {step === 4 && (
          <>
            <p className="ob-subtitle">Which cuisines do you enjoy?</p>
            <div className="ob-chips" style={{ marginBottom: "1rem" }}>
              {CUISINES.map((c) => (
                <span
                  key={c}
                  className={`ob-chip${
                    form.cultural_preferences.includes(c) ? " selected" : ""
                  }`}
                  onClick={() => {
                    const next = form.cultural_preferences.includes(c)
                      ? form.cultural_preferences.filter((v) => v !== c)
                      : [...form.cultural_preferences, c];
                    set("cultural_preferences", next);
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="ob-helper">
              This isn't a restriction — it just helps us suggest meals you'll actually
              enjoy.
            </p>
          </>
        )}

        {/* Error */}
        {error && <p className="ob-error">{error}</p>}

        {/* Navigation */}
        <div className="ob-nav">
          {step > 1 ? (
            <button className="ob-btn ob-btn-secondary" onClick={handleBack}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          <button
            className="ob-btn ob-btn-primary"
            onClick={handleNext}
            disabled={saving}
          >
            {step === 4 ? (saving ? "Saving…" : "Complete ✓") : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;

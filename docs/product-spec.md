# HealBites — Product Specification MVP v1.1

> **Changelog:**
> - v1.1: Reduced shopping categories to 4, added chat quick prompts, English-only MVP, clarified education tip generation, added brand guidelines.
> - v1.0: Initial spec.

---

## 1. PRODUCT VISION

HealBites is a personalized nutrition decision engine. It takes a user's health profile — including chronic conditions, dietary restrictions, cultural preferences, and wellness goals — and produces actionable, medically-informed outputs: a weekly meal plan, a consolidated shopping list, and an AI nutrition chat assistant.

**Core differentiator:** Every interaction educates. Every suggested meal comes with a personalized clinical reason. Users don't just eat better — they understand why.

**This is NOT a recipe app or calorie counter.** It's a decision system that bridges the gap between clinical nutrition guidelines and everyday meals.

**Language:** English only for MVP. Spanish localization planned for v2.

---

## 2. BRAND & UI GUIDELINES

- **Primary colors:** Olive/forest green palette (see existing healbites.ai landing)
- **Logo:** Existing leaf icon (green gradient, rounded square)
- **Tone:** Warm, professional, encouraging — like a friendly nutritionist
- **Visual style:** Clean, modern, organic feel. White/light backgrounds with green accents
- **UI tooling:** Magic MCP by 21st.dev for generating polished, modern React components consistent with the brand

---

## 3. USERS AND ROLES

### 3.1 MVP Roles

| Capability | Basic (free) | Premium |
|---|---|---|
| Full health profile | ✅ | ✅ |
| Weekly meal plan | 1 per week | Unlimited (regenerate, adjust) |
| Shopping list | ✅ (from active plan) | ✅ |
| Nutrition chat | 5 messages/day | Unlimited + full history |
| Meal education tips | ✅ | ✅ |
| Shopping list education tips | ❌ | ✅ |
| Chat quick prompts | ✅ | ✅ |

> **MVP Note:** No real billing. Tier is assigned via a toggle in the user profile for demo purposes. Architecture is Stripe-ready for future integration.

---

## 4. USER FLOW (UX)

### 4.1 Onboarding — 4-Step Wizard

Modern wizard with visual progress bar. Each step has a single purpose. Feels fast and non-intimidating.

**Step 1 — "Tell us about yourself"** (basic data)
- Name (for personalization only)
- Age
- Sex (male / female / prefer not to say)
- Height (cm)
- Weight (kg)
- Physical activity level (sedentary / light / moderate / high) — with icons and short descriptions

**Step 2 — "Your health"** (conditions and goals)
- Health conditions: multi-select chips/tags
  - Options: prediabetes, type 2 diabetes, high cholesterol (LDL), hypertension, gastritis, kidney disease, metabolic syndrome, none, other (free text)
- Primary goal: single select
  - Options: lose weight, maintain weight, build muscle, manage a condition, eat healthier overall

**Step 3 — "Your food preferences"** (diet and restrictions)
- Diet type: single select
  - Options: no restrictions, vegetarian, vegan, pescatarian, keto, mediterranean
- Intolerances/allergies: multi-select chips
  - Options: lactose, gluten, tree nuts, shellfish, egg, soy, none
- Foods you dislike: free text field

**Step 4 — "Your food culture"** (cultural preferences)
- Cuisines you enjoy: multi-select
  - Options: Mexican, Mediterranean, Italian, Asian, Colombian, Peruvian, American, Caribbean, Indian, Middle Eastern, other
- Helper text: "This isn't a restriction — it just helps us suggest meals you'll actually enjoy"

**On completion:** Confirmation screen "Your profile is ready! 🎉" → CTA "Generate my first plan" → Dashboard.

> **Note for v2:** Team physician will review onboarding health fields. All modifications documented in version history.

### 4.2 Dashboard

Clean layout with clear hierarchy:

1. **Personalized greeting:** "Hi, [name] 👋" + brief profile summary
2. **Active Meal Plan card** (or "Generate your first plan" CTA if none exists)
3. **Quick access cards:** Shopping List (if plan exists), Nutrition Chat, Edit Profile
4. **Daily tip:** One educational nugget based on the user's profile (rotated daily from meal plan data)

### 4.3 Meal Plan View

**Structure:** 7 days (Monday to Sunday), 5 meals per day.

| Meal | Type |
|---|---|
| Breakfast | Main meal |
| AM Snack | Light |
| Lunch | Main meal |
| PM Snack | Light |
| Dinner | Main meal |

**Each meal displays:**
- Meal name (e.g., "Oatmeal with Blueberries and Walnuts")
- Key ingredients with portions
- Approximate calories
- 🎓 **Education tip** (1 per meal): short, personalized sentence linking the food to the user's health condition or goal

**Navigation:** Day tabs or swipeable cards. Each meal is collapsible/expandable.

**Daily summary:** Total estimated calories + approximate macro split (protein / carbs / fat).

### 4.4 Shopping List View

Generated from the active weekly meal plan. Grouped into **4 supermarket sections:**

| Section | Includes |
|---|---|
| 🥬 Produce | Fruits, vegetables, herbs |
| 🥩 Proteins | Meats, poultry, fish, seafood, eggs, tofu |
| 🌾 Grains & Dairy | Cereals, bread, pasta, rice, legumes, milk, cheese, yogurt |
| 🥫 Pantry | Oils, condiments, spices, canned goods, nuts, seeds, beverages |

**Each section includes:**
- Ingredient list with consolidated weekly quantities
- ✅ Checkbox to mark as purchased
- 🎓 **Section education tip** (Premium only): brief note on the health benefits of that food group for the user

### 4.5 Nutrition Chat

**Conversational chat interface** with full context of the user's profile and active meal plan.

**Quick prompts** (suggested action buttons below chat input):
- "Can I swap chicken for tuna on Wednesday?"
- "Why was this meal chosen for me?"
- "Snack ideas for sweet cravings"
- "Explain why my plan limits sodium"

Buttons pre-fill the chat input when tapped. Dynamic based on active plan content.

**Behavior by tier:**
- **Basic:** 5 messages/day. Visible counter. No history between sessions.
- **Premium:** Unlimited. Persistent history across sessions.

**The chat MUST NOT:** give medical diagnoses, recommend supplements/medications, or answer topics outside nutrition.

---

## 5. TRANSVERSAL EDUCATION PRINCIPLE

Education is not a section — it's woven into every touchpoint:

| Touchpoint | Education | Example |
|---|---|---|
| Each meal | 1 personalized tip | "Salmon provides omega-3 that helps lower your LDL cholesterol." |
| Shopping list sections | 1 tip per category (Premium) | "Leafy greens are your best source of magnesium — key for kidney health." |
| Chat responses | Always explains "why" + "what" | "You can swap chicken for tuna — tuna is also lean protein and adds omega-3 for your cholesterol." |
| Dashboard | Daily rotating tip | "Consistent meal timing helps stabilize blood sugar throughout the day." |

**Tone:** Warm, positive, never alarmist. Like a friendly nutritionist explaining things patiently.

---

## 6. TECHNICAL ARCHITECTURE

### 6.1 Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL |
| Backend/API | Supabase Edge Functions (Deno) |
| AI | OpenAI API (GPT-4o) via Edge Functions |
| UI Components | Magic MCP by 21st.dev |
| Deploy (frontend) | Netlify |
| Deploy (backend) | Supabase (managed) |

### 6.2 Core Principle

```
Frontend → Edge Function → OpenAI → Database → Frontend
```

- Frontend NEVER calls OpenAI directly
- Frontend NEVER contains nutrition business logic
- All AI output is persisted in the database before being displayed
- Supabase is the single source of truth

### 6.3 Database Tables

**profiles**
```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  name            TEXT,
  age             INTEGER,
  sex             TEXT,
  height_cm       INTEGER,
  weight_kg       NUMERIC,
  activity_level  TEXT CHECK (activity_level IN ('sedentary','light','moderate','high')),
  health_conditions   JSONB DEFAULT '[]',
  nutrition_goal      TEXT,
  dietary_type        TEXT DEFAULT 'none',
  intolerances        JSONB DEFAULT '[]',
  disliked_foods      TEXT DEFAULT '',
  cultural_preferences JSONB DEFAULT '[]',
  onboarding_complete BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

**subscriptions**
```sql
CREATE TABLE subscriptions (
  user_id     UUID PRIMARY KEY REFERENCES profiles(id),
  tier        TEXT DEFAULT 'basic' CHECK (tier IN ('basic','premium')),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

**meal_plans**
```sql
CREATE TABLE meal_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  week_start  DATE,
  plan        JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

**chat_sessions**
```sql
CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  messages    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

**chat_usage**
```sql
CREATE TABLE chat_usage (
  user_id         UUID REFERENCES profiles(id),
  message_date    DATE,
  message_count   INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, message_date)
);
```

### 6.4 Meal Plan JSON Structure

```json
{
  "week_start": "2026-03-02",
  "daily_tip": "Did you know? Consistent meal timing helps stabilize blood sugar levels throughout the day.",
  "days": [
    {
      "day": "monday",
      "meals": [
        {
          "type": "breakfast",
          "name": "Oatmeal with Blueberries and Walnuts",
          "ingredients": [
            {"item": "rolled oats", "amount": "60g", "category": "grains_dairy"},
            {"item": "blueberries", "amount": "80g", "category": "produce"},
            {"item": "walnuts", "amount": "15g", "category": "pantry"},
            {"item": "almond milk", "amount": "200ml", "category": "grains_dairy"}
          ],
          "calories": 380,
          "macros": {"protein": 12, "carbs": 52, "fat": 14},
          "education_tip": "Oatmeal is rich in soluble fiber (beta-glucans), which helps regulate your blood sugar — key for managing your prediabetes."
        }
      ],
      "daily_summary": {
        "total_calories": 1850,
        "macros": {"protein": 95, "carbs": 210, "fat": 62}
      }
    }
  ]
}
```

Each ingredient includes a `category` field mapping to the 4 shopping list sections, making the shopping list a pure data transformation (no AI call needed).

### 6.5 Edge Functions

**generate_meal_plan**
- Input: `{ user_id, week_start }`
- Flow: Auth → load profile → load tier → build prompt → call OpenAI → validate JSON → store in meal_plans → return
- Education tips and daily tip generated inline (same API call)

**generate_shopping_list**
- Input: `{ meal_plan_id }`
- Flow: Auth → load plan → parse ingredients → consolidate quantities → group by category → return
- No OpenAI call (deterministic processing)
- Premium: secondary lightweight OpenAI call for section education tips

**nutrition_chat**
- Input: `{ message, chat_session_id? }`
- Flow: Auth → check daily limit → load profile + plan + history (last 10 msgs) → build contextual prompt → call OpenAI → persist → return
- System prompt enforces nutrition-only scope, profile awareness, no diagnoses

### 6.6 Row Level Security

All tables: RLS enabled. Policy: users can only SELECT, INSERT, UPDATE their own data (`auth.uid() = user_id` or `auth.uid() = id` for profiles).

### 6.7 Database Triggers

Auto-create profile and subscription rows when a new user signs up via Supabase Auth.

---

## 7. NOT INCLUDED IN MVP

- Billing / real payments
- RAG or vector search
- Dynamic plan adjustments mid-week
- Clinician/provider dashboard
- Native mobile app
- Multi-language (English only)
- Push notifications
- Shopping list persistence (checkboxes are local state)

## 8. DESIGNED FOR FUTURE (no refactor needed)

- pgvector for RAG on educational content and meal history
- Stripe for real subscriptions
- Clinician dashboard as new role
- i18n (English + Spanish first)
- Regional cuisine modeling
- Chat history search and bookmarking
- Grocery delivery API integration

---

## 9. VERSION HISTORY & TEAM NOTES

> For tracking modifications requested by team members for future versions.

### Pending for v2 review:
- [ ] Team physician review of onboarding health fields
- [ ] Team physician review of education tip medical accuracy
- [ ] UX team review of onboarding flow
- [ ] Spanish language support scoping
- [ ] RAG implementation for cost optimization at scale

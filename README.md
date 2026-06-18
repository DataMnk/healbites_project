# 🌿 HealBites — Smarter Meals. Healthier Lives.

HealBites is a personalized nutrition app for people managing chronic health conditions — prediabetes, hypertension, high cholesterol, metabolic syndrome, and more. Instead of generic meal suggestions, HealBites builds a complete 7-day plan around your specific health profile, dietary restrictions, food culture, and goals — then gives you an AI nutritionist you can actually talk to.

**Live demo:** [healbitesnutrition.netlify.app](https://healbitesnutrition.netlify.app)

---

## The Problem

Over 130 million Americans live with at least one chronic condition tied directly to diet. Generic nutrition advice doesn't work for this population — a meal plan for someone managing prediabetes looks very different from one for someone with hypertension and lactose intolerance who prefers Caribbean food. Most apps ignore this complexity entirely.

HealBites was built for that gap: real personalization, real clinical context, real cultural awareness.

---

## What It Does

### 4-Step Onboarding Wizard
Users complete a structured health intake: biometrics (age, height, weight, activity level), health conditions, nutrition goals, dietary restrictions and intolerances, food dislikes, and cuisine preferences. This profile drives every downstream AI decision.

### AI-Generated 7-Day Meal Plan
A Supabase Edge Function calls GPT-4o with a structured clinical prompt built from the user's profile. The output is a full week of meals — breakfast, AM snack, lunch, PM snack, dinner — each with:
- Ingredient list with quantities
- Calorie count and macros (protein / carbs / fat)
- A nutrition education tip explaining *why* this meal fits the user's condition

### Automatic Shopping List
A second Edge Function parses the active meal plan and groups all ingredients by category (produce, proteins, grains & dairy, pantry), making it ready to send to the grocery store.

### Nutrition Chat (with Profile Context)
An AI nutritionist chatbot that knows the user's full health profile and current meal plan. Users can ask questions like "Can I swap chicken for tuna on Wednesday?" or "Why is my plan limiting sodium?" The assistant answers in context, not generically. Basic users get 5 messages/day; premium users get persistent chat history across sessions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL with Row Level Security |
| Backend | Supabase Edge Functions (Deno / TypeScript) |
| AI | OpenAI GPT-4o |
| Deployment | Netlify (frontend) |

**Edge Functions:**
- `generate_meal_plan` — builds the 7-day plan from user profile
- `generate_shopping_list` — extracts and groups ingredients
- `nutrition_chat` — context-aware nutritionist chatbot with rate limiting

---

## App Architecture

```
src/
├── pages/
│   ├── HomePage.tsx          # Landing page
│   ├── OnboardingPage.tsx    # 4-step health intake wizard
│   ├── DashboardPage.tsx     # Main hub: plan status, quick access
│   ├── MealPlanPage.tsx      # 7-day view with expandable meals + macros
│   ├── ShoppingListPage.tsx  # Auto-generated grocery list by category
│   └── ChatPage.tsx          # AI nutrition chatbot
│   └── auth/
│       ├── SignInPage.tsx
│       └── SignUpPage.tsx
├── context/
│   └── SessionContext.tsx    # Supabase auth session
├── router/
│   └── index.tsx             # Protected + public routes
└── supabase/
    └── index.ts              # Supabase client init

supabase/
└── functions/
    ├── generate_meal_plan/   # GPT-4o meal plan generation
    ├── generate_shopping_list/
    └── nutrition_chat/       # Profile-aware AI chat
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- An OpenAI API key

### Setup

```bash
# Clone the repo
git clone https://github.com/DataMnk/healbites_project.git
cd healbites_project

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` via the Supabase dashboard SQL editor
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy generate_meal_plan
   supabase functions deploy generate_shopping_list
   supabase functions deploy nutrition_chat
   ```
4. Set Edge Function secrets in your Supabase dashboard:
   - `OPENAI_API_KEY` — your OpenAI API key

### Run

```bash
npm run dev
# App runs at http://localhost:5173
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User health profile (conditions, goals, biometrics, preferences) |
| `meal_plans` | Generated 7-day plans stored as JSONB |
| `subscriptions` | User tier (basic / premium) |
| `chat_sessions` | Persistent chat history for premium users |
| `chat_usage` | Daily message count for rate limiting |

All tables use Supabase Row Level Security — users can only read and write their own data.

---

## Social Impact Context

HealBites was built with a specific community in mind: Spanish-speaking and immigrant families in Miami who carry disproportionately high rates of prediabetes, hypertension, and metabolic syndrome — and who are rarely served well by English-only, culturally generic health tools.

The cuisine preferences in onboarding (Mexican, Colombian, Peruvian, Caribbean, etc.) are not cosmetic. They're a signal that the AI should propose *foods the user will actually eat*, not an ideal diet they'll abandon by Wednesday.

The long-term goal is to make clinical-quality nutrition guidance accessible to people who can't afford a dietitian — using AI as the equalizer.

---

## What's Next

- [ ] Multilingual support (Spanish first)
- [ ] Calorie tracking and progress logging
- [ ] Integration with continuous glucose monitors
- [ ] Collaborative meal planning for families
- [ ] Export meal plan as PDF

---

## Built By

**Diana Gomez** — BS in Artificial Intelligence, Miami Dade College  
Miami, FL · [GitHub](https://github.com/DataMnk)

---

## License

MIT
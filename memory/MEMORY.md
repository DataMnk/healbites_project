# HealBites Project Memory

## Project Identity
- Repo: `my-supabase-app - STARTER` — being transformed into **HealBites** (personalized nutrition app)
- Supabase project ref: `xlgmouhicypeanxhcqsf`
- Spec: [docs/product-spec.md](../docs/product-spec.md)

## Stack
- React 19 + TypeScript + Vite + React Router DOM 7
- Supabase (auth + PostgreSQL + Edge Functions planned)
- Auth: email/password via Supabase Auth
- Deploy target: Netlify (frontend), Supabase (backend)

## Key Files
- Auth context: `src/context/SessionContext.tsx` — useSession hook, onAuthStateChange listener
- Supabase client: `src/supabase/index.ts`
- Router: `src/router/index.tsx`
- Protected route wrapper: `src/router/AuthProtectedRoute.tsx`
- Env validation: `src/config.ts`

## Phase 3 Completed (2026-02-27)
- Edge Function: `supabase/functions/generate_meal_plan/index.ts` — deployed to Supabase
- MealPlanPage: `/meal-plan` route, day tabs, collapsible meal cards, education tips, daily summary
- DashboardPage: fetches latest plan, shows active plan card OR generate CTA, animated generating state
- Router: `/meal-plan` added as protected route
- Edge function flow: JWT auth → profile + tier load → GPT-4o (json_object mode, 8k tokens) → validate → store in meal_plans → return
- OPENAI_API_KEY must be set as Supabase secret: `npx supabase secrets set OPENAI_API_KEY=sk-... --project-ref xlgmouhicypeanxhcqsf`
- getMondayDate() utility in DashboardPage calculates current week's Monday as week_start

## Phase 2 Completed (2026-02-27)
- OnboardingPage: 4-step wizard → saves to profiles table → done screen → /dashboard
- DashboardPage: greeting + profile summary + meal plan CTA + quick cards + tip
- AuthProtectedRoute: session-only check; individual pages handle onboarding redirect
- Routing: sign-in/sign-up redirect to /dashboard; dashboard/onboarding check onboarding_complete and redirect accordingly
- CSS: .app-page scope for light-theme pages (no conflicts with dark auth CSS)
- Key pattern: page-level redirect via `navigate()` in useEffect after profile fetch

## Phase 1 Completed (2026-02-27)
- Removed notes CRUD app entirely
- Created placeholder pages: DashboardPage.tsx, OnboardingPage.tsx
- Router: `/dashboard` and `/onboarding` (both auth-protected), `/protected` removed
- All 5 DB tables created: profiles, subscriptions, meal_plans, chat_sessions, chat_usage
- RLS enabled on all 5 tables, policies: `auth.uid() = user_id` (or `id` for profiles), cmd=ALL
- Trigger `on_auth_user_created` on `auth.users` → auto-creates profile + subscription(tier=basic)

## Database Schema (Supabase)
- **profiles**: id(PK=auth.users.id), name, age, sex, height_cm, weight_kg, activity_level, health_conditions(JSONB), nutrition_goal, dietary_type, intolerances(JSONB), disliked_foods, cultural_preferences(JSONB), onboarding_complete(bool), created_at, updated_at
- **subscriptions**: user_id(PK→profiles.id), tier(basic|premium), active, created_at
- **meal_plans**: id(UUID), user_id→profiles, week_start(DATE), plan(JSONB), created_at
- **chat_sessions**: id(UUID), user_id→profiles, messages(JSONB), created_at, updated_at
- **chat_usage**: user_id+message_date(composite PK), message_count(int)

## Supabase API Access
- Management API: `https://api.supabase.com/v1/projects/xlgmouhicypeanxhcqsf/database/query`
- Token in `.mcp.json` (sbp_... personal access token)
- Empty `[]` response = success for DDL queries

## Business Rules
- Basic tier: 1 meal plan/week, 5 chat messages/day, no shopping list education tips
- Premium tier: unlimited plans, unlimited chat + history, section education tips
- MVP: no real billing, tier toggled via profile for demo
- Frontend NEVER calls OpenAI directly — always via Edge Functions

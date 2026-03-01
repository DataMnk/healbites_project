# HealBites — Implementation Guide

> Your personal step-by-step checklist. This document tracks everything YOU need to do manually, what Claude Code handles, and the exact order of operations.

---

## OVERVIEW: WHO DOES WHAT

| Task | Who does it | Tool |
|---|---|---|
| Write all React/TypeScript frontend code | Claude Code | VS Code terminal |
| Write Edge Function code (Deno/TypeScript) | Claude Code | VS Code terminal |
| Generate SQL files for tables, RLS, triggers | Claude Code | VS Code terminal |
| Execute SQL against Supabase database | You (or Supabase MCP) | Supabase Dashboard or MCP |
| Add API keys and secrets | You | Supabase Dashboard + .env.local |
| Deploy Edge Functions to Supabase | You | Terminal: `supabase functions deploy` |
| Deploy frontend to Netlify | Automatic | Git push → Netlify auto-deploy |
| Configure MCP servers (Supabase, 21st.dev) | You | Terminal (one-time setup) |
| UI polish with Magic MCP components | Claude Code (with MCP) | VS Code terminal |

---

## PRE-WORK: ACCOUNTS & KEYS CHECKLIST

Complete these BEFORE starting any development phase.

### ✅ Accounts needed
- [ ] **Supabase account** — https://supabase.com (you likely already have this)
- [ ] **OpenAI account** — https://platform.openai.com (for API key)
- [ ] **21st.dev account** — https://21st.dev (for Magic MCP API key)
- [ ] **Netlify account** — https://netlify.com (for frontend deploy)
- [ ] **GitHub** — your repo (already have this)

### ✅ Keys to obtain
- [ ] **Supabase Project URL** — Dashboard → Settings → API → Project URL
- [ ] **Supabase Anon Key** — Dashboard → Settings → API → anon/public key
- [ ] **Supabase Service Role Key** — Dashboard → Settings → API → service_role key (for Edge Functions)
- [ ] **OpenAI API Key** — https://platform.openai.com/api-keys → Create new key
- [ ] **21st.dev Magic API Key** — 21st.dev console → Generate key

### ✅ Where each key goes

| Key | Where it goes | When |
|---|---|---|
| Supabase URL | `.env.local` in your project (`VITE_SUPABASE_URL`) | Already done ✅ |
| Supabase Anon Key | `.env.local` (`VITE_SUPABASE_ANON_KEY`) | Already done ✅ |
| OpenAI API Key | Supabase Dashboard → Edge Functions → Secrets → `OPENAI_API_KEY` | Before Phase 3 |
| 21st.dev API Key | Claude Code MCP config (see MCP setup below) | Before Phase 6 |
| Supabase Service Role Key | Used by Supabase CLI locally (auto-configured with `supabase login`) | Before Phase 3 |

---

## MCP SERVERS SETUP

### MCP 1: Supabase MCP (optional but recommended)

This lets Claude Code execute SQL directly against your Supabase database instead of you copy-pasting SQL into the dashboard.

**Setup:**
```bash
# In your terminal (outside Claude Code):
claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest \
  --project-ref YOUR_PROJECT_REF \
  --access-token YOUR_SUPABASE_ACCESS_TOKEN
```

**To get your project ref:**
- Supabase Dashboard → Settings → General → Reference ID

**To get your access token:**
- https://supabase.com/dashboard/account/tokens → Generate new token

**Restart Claude Code after adding.**

### MCP 2: Magic MCP by 21st.dev (for UI generation)

**Setup:**
```bash
# In your terminal (outside Claude Code):
claude mcp add @21st-dev/magic -- npx -y @21st-dev/magic@latest API_KEY="your-21st-dev-key"
```

**Restart Claude Code after adding.**

### Verify MCPs are working:
After restarting Claude Code, type:
```
/mcp
```
This should list your connected MCP servers.

---

## SUPABASE CLI SETUP

You need the Supabase CLI to deploy Edge Functions. This is a ONE-TIME setup.

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase (opens browser)
supabase login

# Link your project (run from your project root)
supabase link --project-ref YOUR_PROJECT_REF

# Initialize Supabase locally (creates supabase/ folder)
supabase init
```

**After this, Claude Code can create Edge Functions in `supabase/functions/` and you deploy them with:**
```bash
supabase functions deploy function-name
```

---

## PHASE-BY-PHASE IMPLEMENTATION

### PHASE 1 — Database & Cleanup (Day 1)

**Claude Code does:**
- Remove all `notes` table references and CRUD code from frontend
- Generate SQL file with all 5 tables + RLS + triggers
- Update frontend routing (remove ProtectedPage notes functionality)

**You do manually:**
1. [ ] Execute the SQL in Supabase Dashboard → SQL Editor (or via Supabase MCP if configured)
2. [ ] Verify tables exist: Dashboard → Table Editor → you should see: profiles, subscriptions, meal_plans, chat_sessions, chat_usage
3. [ ] Verify RLS is enabled: Dashboard → Authentication → Policies → check each table has policies

**Prompt for Claude Code (Phase 1):**
```
Read the HealBites Product Specification document. We're starting Phase 1.

1. Remove ALL code related to the 'notes' table — the ProtectedPage CRUD, any imports, types, or references to notes throughout the codebase. 

2. Generate a single SQL file at `supabase/migrations/001_initial_schema.sql` containing:
   - All 5 tables exactly as specified in section 6.3 of the spec (profiles, subscriptions, meal_plans, chat_sessions, chat_usage)
   - RLS policies for all tables as described in section 6.6
   - A database trigger that auto-creates a row in profiles and subscriptions when a new user signs up via auth (section 6.7)
   
3. Update the existing routing and pages to remove the notes page reference. Keep the auth flow intact.

Do not create any new pages yet. Do not touch the auth system. Just clean up and generate the SQL.
```

---

### PHASE 2 — Onboarding & Profile (Days 2-3)

**Claude Code does:**
- Build 4-step onboarding wizard component
- Create profile form connected to Supabase `profiles` table
- Add `/onboarding` route (protected)
- Update post-signup redirect to go to `/onboarding`
- Add redirect logic: if `onboarding_complete = true` → Dashboard

**You do manually:**
1. [ ] Test signup flow: create a new user → should redirect to onboarding
2. [ ] Complete onboarding → verify data appears in `profiles` table in Supabase Dashboard
3. [ ] Test redirect: log in again → should skip onboarding and go to Dashboard

**Prompt for Claude Code (Phase 2):**
```
Read the HealBites Product Specification, section 4.1 (Onboarding).

Build the onboarding wizard:

1. Create a reusable multi-step wizard component with a visual progress bar (4 steps).

2. Implement all 4 steps exactly as specified:
   - Step 1: Basic data (name, age, sex, height, weight, activity level with descriptive labels)
   - Step 2: Health conditions (multi-select chips) + primary goal (single select)
   - Step 3: Diet type (single select) + intolerances (multi-select chips) + disliked foods (free text)
   - Step 4: Cultural preferences (multi-select) with helper text

3. On completion: upsert data to the 'profiles' table via Supabase client, set onboarding_complete = true, show confirmation screen with CTA "Generate my first plan" that navigates to /dashboard.

4. Add route /onboarding — protected (must be logged in). If onboarding_complete is already true, redirect to /dashboard.

5. Update the post-signup flow: after successful signup, redirect to /onboarding instead of /.

6. Create a basic /dashboard page (placeholder for now) that shows "Hi, [name]" from the profile.

Use clean, functional React with TypeScript. Style with basic CSS for now (we'll polish with Magic MCP later). Make the wizard feel smooth and non-intimidating.
```

---

### PHASE 3 — Meal Plan Generation (Days 4-5)

**Claude Code does:**
- Create Edge Function `generate_meal_plan` in `supabase/functions/`
- Design the OpenAI prompt
- Build meal plan view page
- Connect Dashboard → generate → display

**You do manually:**
1. [ ] Add OpenAI API key to Supabase: Dashboard → Edge Functions → Secrets → add `OPENAI_API_KEY`
2. [ ] Deploy the Edge Function: `supabase functions deploy generate_meal_plan`
3. [ ] Test: click "Generate plan" on Dashboard → should generate and display a meal plan
4. [ ] Verify plan is stored in `meal_plans` table in Supabase Dashboard

**Prompt for Claude Code (Phase 3):**
```
Read the HealBites Product Specification, sections 4.3, 6.4, and 6.5.

Build the meal plan generation system:

1. Create a Supabase Edge Function at supabase/functions/generate_meal_plan/index.ts:
   - Accept { user_id, week_start } in the request body
   - Authenticate the request using Supabase auth
   - Load the user's full profile from the profiles table
   - Load the user's subscription tier
   - Construct a detailed OpenAI prompt that includes ALL profile data (conditions, goals, diet type, intolerances, dislikes, cultural preferences, demographics)
   - The prompt must instruct GPT-4o to return a JSON object matching the exact structure in section 6.4 of the spec — including education_tip for each meal and a daily_tip
   - Each ingredient must include a "category" field (produce, proteins, grains_dairy, pantry)
   - Call OpenAI API using the OPENAI_API_KEY secret
   - Parse and validate the response as JSON
   - Store the result in the meal_plans table
   - Return the stored plan

2. Build the meal plan view page at /meal-plan:
   - Display 7 days with tabs or navigation
   - Each day shows 5 meals (breakfast, snack_am, lunch, snack_pm, dinner)
   - Each meal shows: name, ingredients with portions, calories, education tip with 🎓 icon
   - Collapsible/expandable meals
   - Daily summary at bottom (total calories, macro split)

3. Update the Dashboard:
   - If no active plan: show "Generate your first meal plan" button
   - If plan exists: show plan summary card with link to full view
   - Button calls the Edge Function and navigates to /meal-plan on success

Use functional UI for now. The Edge Function must use Deno and the standard Supabase Edge Function pattern.
```

---

### PHASE 4 — Shopping List (Days 5-6)

**Claude Code does:**
- Create Edge Function `generate_shopping_list`
- Build shopping list page with 4 sections + checkboxes
- Connect to active meal plan

**You do manually:**
1. [ ] Deploy: `supabase functions deploy generate_shopping_list`
2. [ ] Test: with an active plan, generate shopping list → verify 4 sections appear correctly

**Prompt for Claude Code (Phase 4):**
```
Read the HealBites Product Specification, sections 4.4 and 6.5.

Build the shopping list:

1. Create Edge Function at supabase/functions/generate_shopping_list/index.ts:
   - Accept { meal_plan_id }
   - Authenticate the request
   - Load the meal plan from meal_plans table
   - Parse ALL ingredients from all 7 days, all 5 meals
   - Consolidate duplicate items (sum quantities)
   - Group by the "category" field into 4 sections: produce, proteins, grains_dairy, pantry
   - For Premium users: make a secondary OpenAI call to generate one education tip per section based on the user's health conditions
   - Return the organized shopping list

2. Build the shopping list page at /shopping-list:
   - 4 sections with icons: 🥬 Produce, 🥩 Proteins, 🌾 Grains & Dairy, 🥫 Pantry
   - Each item shows ingredient name + consolidated quantity
   - Checkbox next to each item (local state only, no persistence)
   - Premium users see a 🎓 education tip at the top of each section
   - Show which meal plan this list is derived from

3. Add "View Shopping List" button on Dashboard (only visible if active plan exists).
```

---

### PHASE 5 — Nutrition Chat (Days 6-7)

**Claude Code does:**
- Create Edge Function `nutrition_chat`
- Build chat interface
- Implement quick prompts
- Implement message limit for Basic tier

**You do manually:**
1. [ ] Deploy: `supabase functions deploy nutrition_chat`
2. [ ] Test as Basic user: send 5 messages → verify limit kicks in
3. [ ] Test as Premium: verify unlimited + history persists

**Prompt for Claude Code (Phase 5):**
```
Read the HealBites Product Specification, sections 4.5 and 6.5.

Build the nutrition chat:

1. Create Edge Function at supabase/functions/nutrition_chat/index.ts:
   - Accept { message, chat_session_id? }
   - Authenticate the request
   - Check daily message limit for Basic users (5/day via chat_usage table). If exceeded, return error with message "You've reached your daily message limit. Upgrade to Premium for unlimited chat."
   - Load user profile + most recent meal plan + chat history (last 10 messages from session)
   - Build a strict system prompt:
     * "You are a clinical nutrition assistant for HealBites."
     * "You only answer questions related to the user's nutrition, meal plan, and dietary health."
     * "Always explain WHY in addition to WHAT."
     * "Never give medical diagnoses, recommend supplements or medications."
     * Include full user profile and active meal plan in context
   - Call OpenAI
   - Append user message + assistant response to chat_sessions.messages
   - Increment chat_usage for today
   - Return the response

2. Build chat interface at /chat:
   - Message bubble UI (user messages right, assistant left)
   - Input field at bottom
   - Quick prompt buttons above the input:
     * "Can I swap chicken for tuna on Wednesday?"
     * "Why was this meal chosen for me?"
     * "Snack ideas for sweet cravings"
     * "Explain why my plan limits sodium"
   - Quick prompts pre-fill the input when tapped
   - For Basic: show message counter "X messages left today"
   - For Premium: show full chat history from previous sessions

3. Add "Chat with your nutritionist" button on Dashboard.
```

---

### PHASE 6 — UI Polish & Demo (Days 7-8)

**Pre-requisite:** Configure Magic MCP (see MCP setup section above).

**Claude Code does (with Magic MCP):**
- Regenerate all UI components using 21st.dev's modern component library
- Apply HealBites brand (green palette, clean, organic)
- Polish: responsive, consistent, smooth transitions
- Redesign landing page

**You do manually:**
1. [ ] Configure 21st.dev MCP (see setup section)
2. [ ] Review each page and provide feedback to Claude Code
3. [ ] Deploy final version to Netlify
4. [ ] Full flow test: signup → onboarding → generate plan → shopping list → chat

**Prompt for Claude Code (Phase 6):**
```
We're now in the UI polish phase. Use Magic MCP (@21st-dev/magic) to upgrade all UI components.

Our brand: HealBites — olive/forest green palette, white backgrounds, organic feel, warm and modern. Think health + technology.

Upgrade these components using 21st.dev:
1. Onboarding wizard — modern stepper, clean form inputs, progress indicator
2. Dashboard — card-based layout, personalized greeting, clear CTAs
3. Meal plan view — beautiful day tabs, meal cards with education tips highlighted
4. Shopping list — section cards with icons, elegant checkboxes
5. Chat interface — modern chat bubbles, floating quick prompt buttons
6. Landing page — hero section with HealBites branding, feature highlights, CTA

Make everything responsive (mobile-first). Use smooth transitions between views. Keep the green palette consistent throughout.
```

---

## NETLIFY DEPLOY SETUP

**One-time setup:**
1. [ ] Push your project to GitHub (if not already)
2. [ ] Go to https://app.netlify.com → "Add new site" → "Import an existing project"
3. [ ] Connect your GitHub repo
4. [ ] Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. [ ] Environment variables: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
6. [ ] Deploy!

After initial setup, every `git push` auto-deploys to Netlify.

---

## TROUBLESHOOTING CHEAT SHEET

| Problem | Solution |
|---|---|
| Edge Function returns 401 | Check that you're passing the Supabase auth token in the request header |
| Edge Function returns empty | Check Supabase Dashboard → Edge Functions → Logs for errors |
| Tables not found | Run the SQL migration in Dashboard → SQL Editor |
| RLS blocking data | Check policies in Dashboard → Authentication → Policies |
| OpenAI call fails in Edge Function | Verify `OPENAI_API_KEY` secret is set in Dashboard → Edge Functions → Secrets |
| MCP not showing in Claude Code | Run `/mcp` to check. Try restarting Claude Code with `exit` then `claude` |
| Netlify build fails | Check that `.env.local` vars are also in Netlify's environment variables |

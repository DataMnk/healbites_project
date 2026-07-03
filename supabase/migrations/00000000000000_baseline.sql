-- Baseline migration: captura el estado real de la BD al 2026-07-03.
-- NO editar este archivo. Cambios futuros = nueva migracion con timestamp posterior.

create extension if not exists "pgcrypto" with schema "extensions";

create table public.profiles (
    id uuid not null,
    name text,
    age integer,
    sex text,
    height_cm integer,
    weight_kg numeric,
    activity_level text,
    health_conditions jsonb default '[]'::jsonb,
    nutrition_goal text,
    dietary_type text default 'none'::text,
    intolerances jsonb default '[]'::jsonb,
    disliked_foods text default ''::text,
    cultural_preferences jsonb default '[]'::jsonb,
    onboarding_complete boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create table public.subscriptions (
    user_id uuid not null,
    tier text default 'basic'::text,
    active boolean default true,
    created_at timestamp with time zone default now()
);

create table public.meal_plans (
    id uuid not null default gen_random_uuid(),
    user_id uuid,
    week_start date,
    plan jsonb,
    created_at timestamp with time zone default now()
);

create table public.chat_sessions (
    id uuid not null default gen_random_uuid(),
    user_id uuid,
    messages jsonb default '[]'::jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create table public.chat_usage (
    user_id uuid not null,
    message_date date not null,
    message_count integer default 0
);

alter table only public.profiles
    add constraint profiles_pkey primary key (id);

alter table only public.profiles
    add constraint profiles_activity_level_check
    check (
        activity_level = any (
            array[
                'sedentary'::text,
                'light'::text,
                'moderate'::text,
                'high'::text
            ]
        )
    );

alter table only public.subscriptions
    add constraint subscriptions_pkey primary key (user_id);

alter table only public.subscriptions
    add constraint subscriptions_tier_check
    check (
        tier = any (
            array[
                'basic'::text,
                'premium'::text
            ]
        )
    );

alter table only public.meal_plans
    add constraint meal_plans_pkey primary key (id);

alter table only public.chat_sessions
    add constraint chat_sessions_pkey primary key (id);

alter table only public.chat_usage
    add constraint chat_usage_pkey primary key (user_id, message_date);

alter table only public.profiles
    add constraint profiles_id_fkey
    foreign key (id) references auth.users(id);

alter table only public.subscriptions
    add constraint subscriptions_user_id_fkey
    foreign key (user_id) references public.profiles(id);

alter table only public.meal_plans
    add constraint meal_plans_user_id_fkey
    foreign key (user_id) references public.profiles(id);

alter table only public.chat_sessions
    add constraint chat_sessions_user_id_fkey
    foreign key (user_id) references public.profiles(id);

alter table only public.chat_usage
    add constraint chat_usage_user_id_fkey
    foreign key (user_id) references public.profiles(id);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.meal_plans enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_usage enable row level security;

create policy "profiles: own row"
on public.profiles
as permissive
for all
to public
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "subscriptions: own row"
on public.subscriptions
as permissive
for all
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meal_plans: own row"
on public.meal_plans
as permissive
for all
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "chat_sessions: own row"
on public.chat_sessions
as permissive
for all
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "chat_usage: own row"
on public.chat_usage
as permissive
for all
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.subscriptions (user_id, tier)
  values (new.id, 'basic');

  return new;
end;
$function$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

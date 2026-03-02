-- Fitted Supabase schema
-- Run in SQL Editor in your Supabase project dashboard

-- Wardrobe items (one per clothing photo)
create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  tags jsonb default '{}',
  is_available boolean default true,
  pinned boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table public.wardrobe_items enable row level security;

drop policy if exists "Users can read own wardrobe" on public.wardrobe_items;
create policy "Users can read own wardrobe"
  on public.wardrobe_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own wardrobe" on public.wardrobe_items;
create policy "Users can insert own wardrobe"
  on public.wardrobe_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own wardrobe" on public.wardrobe_items;
create policy "Users can delete own wardrobe"
  on public.wardrobe_items for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can update own wardrobe" on public.wardrobe_items;
create policy "Users can update own wardrobe"
  on public.wardrobe_items for update
  using (auth.uid() = user_id);

-- Add columns if table already existed (run in SQL Editor if you had wardrobe_items before)
alter table public.wardrobe_items add column if not exists is_available boolean default true;
alter table public.wardrobe_items add column if not exists pinned boolean default false;

-- Outfit feedback: thumbs up/down and "Outfit doesn't fit" so we can improve recommendations
create table if not exists public.outfit_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion text,
  weather_summary text,
  selected_ids jsonb,
  reason text,
  rating text check (rating is null or rating in ('up', 'down')),
  created_at timestamptz default now()
);

alter table public.outfit_feedback enable row level security;

-- For existing DB: make reason nullable and add rating column (run if outfit_feedback already existed)
alter table public.outfit_feedback alter column reason drop not null;
alter table public.outfit_feedback add column if not exists rating text check (rating is null or rating in ('up', 'down'));

drop policy if exists "Users can insert own feedback" on public.outfit_feedback;
create policy "Users can insert own feedback"
  on public.outfit_feedback for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own feedback" on public.outfit_feedback;
create policy "Users can read own feedback"
  on public.outfit_feedback for select
  using (auth.uid() = user_id);

-- Saved outfits (Outfit of the day / history) and share
create table if not exists public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  share_id text not null unique,
  selected_ids jsonb not null default '[]',
  items_snapshot jsonb not null default '[]',
  weather_summary text,
  city text,
  occasion text,
  explanation text,
  created_at timestamptz default now()
);

create index if not exists idx_saved_outfits_user_id on public.saved_outfits(user_id);
create index if not exists idx_saved_outfits_share_id on public.saved_outfits(share_id);

alter table public.saved_outfits enable row level security;

drop policy if exists "Users can insert own saved outfits" on public.saved_outfits;
create policy "Users can insert own saved outfits"
  on public.saved_outfits for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own saved outfits" on public.saved_outfits;
create policy "Users can read own saved outfits"
  on public.saved_outfits for select
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own saved outfits" on public.saved_outfits;
create policy "Users can delete own saved outfits"
  on public.saved_outfits for delete
  using (auth.uid() = user_id);

-- Storage: create bucket "wardrobe" in Dashboard (Storage → New bucket, name: wardrobe, Public).
-- Then add policy (Storage → wardrobe → Policies → New policy):
-- Policy name: "Public read", Allowed operation: SELECT, Target: (none), USING: true
-- Policy name: "Authenticated upload", Allowed operation: INSERT, Target: (none),
--   WITH CHECK: (bucket_id = 'wardrobe' AND (storage.foldername(name))[1] = auth.uid()::text)

-- API usage tracking (lifetime limits for non-whitelisted users)
drop table if exists public.api_usage;
create table public.api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  count integer not null default 0,
  primary key (user_id, endpoint)
);

alter table public.api_usage enable row level security;

drop policy if exists "Users can read own usage" on public.api_usage;
create policy "Users can read own usage"
  on public.api_usage for select
  using (auth.uid() = user_id);

-- Atomically increment usage count and return the new value
create or replace function increment_api_usage(
  p_user_id uuid,
  p_endpoint text
) returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  insert into public.api_usage (user_id, endpoint, count)
  values (p_user_id, p_endpoint, 1)
  on conflict (user_id, endpoint)
  do update set count = api_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

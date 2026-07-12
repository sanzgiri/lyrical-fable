create extension if not exists pgcrypto;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  title text not null,
  body text not null,
  controls jsonb not null default '{}'::jsonb,
  audio_path text,
  created_at timestamptz not null default now()
);

create index if not exists stories_session_created_idx
  on public.stories (session_id, created_at desc);

-- Create this private bucket in Supabase Storage.
-- The server uses the service-role key to create signed playback URLs.
insert into storage.buckets (id, name, public)
values ('story-audio', 'story-audio', false)
on conflict (id) do nothing;

-- The API uses the service-role key, so RLS can remain closed to browsers.
alter table public.stories enable row level security;

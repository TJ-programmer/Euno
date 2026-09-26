-- ============================================================
-- EUNO CONTENT SYSTEM
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONTENT ITEMS
-- Canonical knowledge objects.
-- One content item can appear in both Home and Flow.
-- ------------------------------------------------------------

create table public.content_items (
  id uuid primary key default gen_random_uuid(),

  slug text unique not null,

  content_type text not null default 'evergreen'
    check (
      content_type in (
        'evergreen',
        'news',
        'explainer',
        'concept'
      )
    ),

  title text not null,

  hook text,

  summary text,

  body jsonb not null default '{}'::jsonb,

  source_url text,
  source_name text,
  source_published_at timestamptz,

  image_url text,

  estimated_minutes integer
    check (estimated_minutes is null or estimated_minutes > 0),

  difficulty text
    check (
      difficulty is null
      or difficulty in ('quick', 'balanced', 'deep')
    ),

  quality_score numeric(4,3)
    check (
      quality_score is null
      or (quality_score >= 0 and quality_score <= 1)
    ),

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'review',
        'published',
        'archived'
      )
    ),

  published_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. CONTENT PRESENTATIONS
--
-- How a canonical content item appears on a surface.
--
-- surface = home / flow
--
-- This lets the same knowledge object have different UX.
-- ------------------------------------------------------------

create table public.content_presentations (
  id uuid primary key default gen_random_uuid(),

  content_id uuid not null
    references public.content_items(id)
    on delete cascade,

  surface text not null
    check (
      surface in ('home', 'flow')
    ),

  label text,

  display_title text,

  display_summary text,

  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (content_id, surface)
);


-- ------------------------------------------------------------
-- 3. CONTENT ↔ TOPICS
--
-- Many-to-many relationship.
--
-- One article can belong to multiple topics.
-- One topic can contain many articles.
-- ------------------------------------------------------------

create table public.content_topics (
  content_id uuid not null
    references public.content_items(id)
    on delete cascade,

  topic_id text not null
    references public.curiosity_topics(id)
    on delete cascade,

  relevance_score numeric(4,3) not null default 1.0
    check (
      relevance_score >= 0
      and relevance_score <= 1
    ),

  created_at timestamptz not null default now(),

  primary key (content_id, topic_id)
);


-- ------------------------------------------------------------
-- 4. CONTENT EVENTS
--
-- Behavioral signals used later by the recommendation system.
-- ------------------------------------------------------------

create table public.content_events (
  id bigint generated always as identity primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  content_id uuid not null
    references public.content_items(id)
    on delete cascade,

  event_type text not null
    check (
      event_type in (
        'impression',
        'open',
        'double_tap',
        'read_start',
        'read_complete',
        'flow_start',
        'flow_complete',
        'save',
        'like',
        'dislike',
        'skip',
        'share'
      )
    ),

  surface text
    check (
      surface is null
      or surface in ('home', 'flow')
    ),

  position integer,

  duration_seconds integer,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================

create index content_items_status_idx
  on public.content_items(status);

create index content_items_published_at_idx
  on public.content_items(published_at desc);

create index content_items_type_idx
  on public.content_items(content_type);

create index content_presentations_surface_idx
  on public.content_presentations(surface);

create index content_topics_topic_idx
  on public.content_topics(topic_id);

create index content_events_user_idx
  on public.content_events(user_id);

create index content_events_content_idx
  on public.content_events(content_id);

create index content_events_created_at_idx
  on public.content_events(created_at desc);


-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create trigger content_items_updated_at
before update on public.content_items
for each row
execute function public.update_updated_at();

create trigger content_presentations_updated_at
before update on public.content_presentations
for each row
execute function public.update_updated_at();
-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.content_items enable row level security;
alter table public.content_presentations enable row level security;
alter table public.content_topics enable row level security;
alter table public.content_events enable row level security;


-- ------------------------------------------------------------
-- Published content can be read by authenticated users.
-- ------------------------------------------------------------

create policy "authenticated users can read published content"
on public.content_items
for select
to authenticated
using (
  status = 'published'
);


create policy "authenticated users can read published presentations"
on public.content_presentations
for select
to authenticated
using (
  exists (
    select 1
    from public.content_items c
    where c.id = content_presentations.content_id
      and c.status = 'published'
  )
);


create policy "authenticated users can read content topics"
on public.content_topics
for select
to authenticated
using (
  exists (
    select 1
    from public.content_items c
    where c.id = content_topics.content_id
      and c.status = 'published'
  )
);


-- ------------------------------------------------------------
-- Users can create/read their own events.
-- ------------------------------------------------------------

create policy "users can insert own content events"
on public.content_events
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy "users can read own content events"
on public.content_events
for select
to authenticated
using (
  auth.uid() = user_id
);

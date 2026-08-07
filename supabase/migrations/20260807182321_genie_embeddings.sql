-- Group G (implementationplan.md, phases 65–69): Circle Genie.
--
-- Embedding dimension is 128 — an arbitrary placeholder pending a real
-- embedding-provider decision (Phase-6-style dummy pattern; see
-- services/genie/src/embedding/mock-embedding.provider.ts). A real
-- provider (OpenAI text-embedding-3-small=1536, Cohere embed-v3=1024)
-- would need a migration to widen this column before going live.
--
-- edgecase.md §2.5 / Phase 65's "delete-listener" requirement is satisfied
-- structurally: both embedding tables FK to their source row with
-- `on delete cascade`, so a deleted post/comment's embedding disappears
-- automatically — no separate trigger/listener code needed, and no way
-- for it to be forgotten later the way an app-level delete hook could be.
create table public.post_embeddings (
  post_id uuid primary key references public.posts(id) on delete cascade,
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  embedding vector(128) not null,
  content_snippet text not null,
  created_at timestamptz not null default now()
);

create table public.comment_embeddings (
  comment_id uuid primary key references public.comments(id) on delete cascade,
  -- Denormalized from the parent post so a neighbourhood-scoped search
  -- doesn't need a join back through comments -> posts on every query.
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  embedding vector(128) not null,
  content_snippet text not null,
  created_at timestamptz not null default now()
);

create index post_embeddings_vector_idx on public.post_embeddings using hnsw (embedding vector_cosine_ops);
create index comment_embeddings_vector_idx on public.comment_embeddings using hnsw (embedding vector_cosine_ops);

-- No client access at all — embeddings are an internal implementation
-- detail of the Genie backend service (which connects as service_role).
-- A client never needs to read/write these directly; it only ever calls
-- the /genie/query and /genie/embed endpoints.
alter table public.post_embeddings enable row level security;
alter table public.comment_embeddings enable row level security;
grant select, insert, update, delete on public.post_embeddings to service_role;
grant select, insert, update, delete on public.comment_embeddings to service_role;

-- The Genie service needs to read post/comment text to embed it, and
-- profiles to attribute results to an author — none of these were
-- granted to service_role before (only `authenticated`), same class of
-- gap fixed proactively this time per the Group E lesson.
grant select on public.posts to service_role;
grant select on public.comments to service_role;

-- Cosine-similarity search, scoped to one neighbourhood — the actual
-- retrieval half of RAG. service_role-only; the client never calls this
-- directly, only through the Genie backend's /genie/query endpoint.
create function public.search_post_embeddings(
  p_neighbourhood_id uuid,
  p_query_embedding vector(128),
  p_limit int default 5
)
returns table (post_id uuid, content_snippet text, similarity double precision, created_at timestamptz)
language sql
stable
as $$
  select post_id, content_snippet, 1 - (embedding <=> p_query_embedding) as similarity, created_at
  from public.post_embeddings
  where neighbourhood_id = p_neighbourhood_id
  order by embedding <=> p_query_embedding
  limit p_limit;
$$;

grant execute on function public.search_post_embeddings to service_role;

-- Phase 69: query log doubles as the cache (recent identical
-- normalized_query + neighbourhood_id -> reuse the stored answer) and the
-- audit trail (source_post_ids makes every answer traceable back to real
-- posts — required for Phase 68's grounding guarantee to mean anything).
create table public.genie_query_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  query text not null,
  normalized_query text not null,
  answer text not null,
  source_post_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index genie_query_log_cache_idx on public.genie_query_log (neighbourhood_id, normalized_query, created_at desc);

alter table public.genie_query_log enable row level security;

create policy genie_query_log_select_own on public.genie_query_log
  for select using (auth.uid() = user_id);

grant select on public.genie_query_log to authenticated;
grant select, insert on public.genie_query_log to service_role;

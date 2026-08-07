-- Phase 3 (implementationplan.md Group A): foundational extensions.
--
-- postgis  — geohash/radius queries for society/tower/flat proximity
--            (architecture.md §5 society_memberships.geohash, §6.2 "5 nearest
--            neighbours" SOS dispatch, §6.4 ad targeting radius).
-- vector   — pgvector, embeddings store for Circle Genie's RAG search
--            (architecture.md §6.3). Enabled now so the extension is present
--            from day one; actual embedding tables land in Group G.
create extension if not exists postgis with schema extensions;
create extension if not exists vector with schema extensions;

-- pg_trgm — trigram search, used for address/society-name autosuggest
-- fallback and Explore/Topic text search (architecture.md §6.1 step 2).
create extension if not exists pg_trgm with schema extensions;

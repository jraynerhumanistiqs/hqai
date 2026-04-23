# HQ.ai Knowledge Ingestion

Builds the RAG corpus that powers the `search_knowledge` chat tool.

## Prerequisites
1. Run `supabase/migrations/enable_pgvector_rag.sql` in the Supabase SQL Editor.
2. Set env vars in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

## Awards
1. Place one `.txt` or `.md` file per award under `./data/awards/`.
2. First line should be: `# MA000003 — General Retail Industry Award 2020`.
3. Run: `npm run ingest:awards` (or `-- --dry` to preview without inserting).

## FWO / NES / internal
1. Under `./data/fwo/`, create `manifest.json`:
   ```json
   [
     { "source": "fair-work-ombudsman",
       "url": "https://www.fairwork.gov.au/pay-and-wages/minimum-wages/redundancy-pay",
       "title": "Fair Work Ombudsman — Redundancy pay",
       "file": "redundancy-pay.md" }
   ]
   ```
2. Drop each referenced `.md` alongside it.
3. Run: `npm run ingest:fwo`.

## Reindex
After large inserts:
```sql
vacuum analyze public.knowledge_chunks;
reindex index public.knowledge_chunks_embedding_ivfflat;
```

## Swap embeddings to Voyage-law-2 (optional)
1. Rebuild the column: `alter table knowledge_chunks alter column embedding type vector(1024);`
2. Drop + recreate the ivfflat index.
3. Update `lib/rag.ts` (`EMBED_DIMS`, `EMBED_MODEL`, endpoint) and both ingest scripts.

-- =====================================================================
--  Migration 004: Paper analysis fields (novelty, research gap, review PDF)
--  Run once in Supabase -> SQL Editor (safe to re-run).
--
--  Members can write their analysis of a paper (novelty, research gap,
--  methodology, results...) as text, or upload it as a PDF ("review PDF").
--  The review PDF lives in the existing private 'papers' bucket under the
--  owner's folder, so the existing storage policies already cover it.
-- =====================================================================

alter table public.papers add column if not exists novelty         text;
alter table public.papers add column if not exists research_gap    text;
alter table public.papers add column if not exists review_pdf_path text;  -- object path inside 'papers' bucket

-- Make PostgREST pick up the new columns immediately.
notify pgrst, 'reload schema';

-- STYBL outage fix: waitlist_submissions exists but the anon/authenticated
-- API roles cannot read or write it (PostgREST 42501 permission denied),
-- and the waitlist-images storage bucket is missing.
--
-- Run this in the Supabase SQL Editor for project ccmqupdnenxuxmpgxzqo
-- (Dashboard → SQL → New query → Run). Safe to re-run.

-- Table-level grants for PostgREST roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.waitlist_submissions TO anon, authenticated;

-- RLS policies (required once RLS is enabled on the table)
ALTER TABLE public.waitlist_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read waitlist" ON public.waitlist_submissions;
CREATE POLICY "Allow public read waitlist"
  ON public.waitlist_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert waitlist" ON public.waitlist_submissions;
CREATE POLICY "Allow public insert waitlist"
  ON public.waitlist_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Optional coin image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('waitlist-images', 'waitlist-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
CREATE POLICY "Allow public uploads"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'waitlist-images');

DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
CREATE POLICY "Allow public reads"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'waitlist-images');

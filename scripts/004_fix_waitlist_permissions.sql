-- STYBL outage fix: waitlist_submissions exists but the anon/authenticated
-- API roles cannot write it (PostgREST 42501 permission denied),
-- and the waitlist-images storage bucket is missing.
--
-- Public access is intentionally narrow:
--   - anon/authenticated may INSERT waitlist rows
--   - anon/authenticated may SELECT only non-PII coin fields via waitlist_coins
--   - full email/message reads require the service_role key (admin page)
--
-- Run this in the Supabase SQL Editor for project ccmqupdnenxuxmpgxzqo
-- (Dashboard → SQL → New query → Run). Safe to re-run.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public may join the waitlist, but must not read emails/messages from the table.
REVOKE ALL ON TABLE public.waitlist_submissions FROM anon, authenticated;
GRANT INSERT ON TABLE public.waitlist_submissions TO anon, authenticated;

ALTER TABLE public.waitlist_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read waitlist" ON public.waitlist_submissions;
DROP POLICY IF EXISTS "Allow public insert waitlist" ON public.waitlist_submissions;

CREATE POLICY "Allow public insert waitlist"
  ON public.waitlist_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Coin pile UI only needs non-PII columns.
CREATE OR REPLACE VIEW public.waitlist_coins
WITH (security_invoker = false) AS
SELECT id, image_url, coin_x, coin_y, coin_rotation, created_at
FROM public.waitlist_submissions;

GRANT SELECT ON TABLE public.waitlist_coins TO anon, authenticated;

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

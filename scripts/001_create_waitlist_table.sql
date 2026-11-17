-- Create table for storing waitlist submissions
CREATE TABLE IF NOT EXISTS waitlist_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  message TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_submissions(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_submissions(created_at DESC);

-- PostgREST (anon/authenticated) needs explicit grants + RLS policies
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.waitlist_submissions TO anon, authenticated;

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

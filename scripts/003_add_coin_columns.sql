-- Add coin position and rotation data to persist visual state
ALTER TABLE waitlist_submissions 
ADD COLUMN IF NOT EXISTS coin_x FLOAT,
ADD COLUMN IF NOT EXISTS coin_y FLOAT,
ADD COLUMN IF NOT EXISTS coin_rotation FLOAT;

-- Public coin pile view (no email/message PII)
CREATE OR REPLACE VIEW public.waitlist_coins
WITH (security_invoker = false) AS
SELECT id, image_url, coin_x, coin_y, coin_rotation, created_at
FROM public.waitlist_submissions;

GRANT SELECT ON TABLE public.waitlist_coins TO anon, authenticated;

-- Create storage policy only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow public reads'
  ) THEN
    CREATE POLICY "Allow public reads" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'waitlist-images');
  END IF;
END $$;

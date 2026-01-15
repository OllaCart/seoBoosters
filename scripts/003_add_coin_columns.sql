-- Add coin position and rotation data to persist visual state
ALTER TABLE waitlist_submissions 
ADD COLUMN IF NOT EXISTS coin_x FLOAT,
ADD COLUMN IF NOT EXISTS coin_y FLOAT,
ADD COLUMN IF NOT EXISTS coin_rotation FLOAT;

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

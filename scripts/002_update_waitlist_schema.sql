-- Add coin position and rotation data to persist visual state
ALTER TABLE waitlist_submissions 
ADD COLUMN IF NOT EXISTS coin_x FLOAT,
ADD COLUMN IF NOT EXISTS coin_y FLOAT,
ADD COLUMN IF NOT EXISTS coin_rotation FLOAT;

-- Create storage bucket for coin images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('waitlist-images', 'waitlist-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow public uploads and reads
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'waitlist-images');

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'waitlist-images');

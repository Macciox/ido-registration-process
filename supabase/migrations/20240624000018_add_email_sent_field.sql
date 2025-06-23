-- Add email_sent field to verification_codes table
ALTER TABLE public.verification_codes
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT NULL;
-- Run this SQL directly in the Supabase SQL Editor

-- Create verification_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Create index on email for faster lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS verification_codes_email_idx ON public.verification_codes(email);

-- Grant access to the authenticated role
GRANT SELECT, INSERT, UPDATE ON public.verification_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.verification_codes TO anon;
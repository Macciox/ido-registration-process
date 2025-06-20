-- Create verification_codes table
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS verification_codes_email_idx ON public.verification_codes(email);

-- Create function to generate a random 6-digit code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  -- Generate a random 6-digit code
  code := floor(random() * 900000 + 100000)::TEXT;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
-- Create a stored procedure to create the verification_codes table if it doesn't exist
CREATE OR REPLACE FUNCTION create_verification_codes_table()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'verification_codes'
  ) THEN
    -- Create the table
    CREATE TABLE public.verification_codes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE
    );
    
    -- Create index on email for faster lookups
    CREATE INDEX verification_codes_email_idx ON public.verification_codes(email);
    
    RAISE NOTICE 'Created verification_codes table';
  ELSE
    RAISE NOTICE 'verification_codes table already exists';
  END IF;
END;
$$ LANGUAGE plpgsql;
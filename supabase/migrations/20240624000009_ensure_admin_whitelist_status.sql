-- Run this SQL directly in the Supabase SQL Editor

-- Add status column to admin_whitelist if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admin_whitelist'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'admin_whitelist'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.admin_whitelist ADD COLUMN status TEXT DEFAULT 'pending';
    RAISE NOTICE 'Added status column to admin_whitelist table';
  ELSE
    RAISE NOTICE 'status column already exists in admin_whitelist table';
  END IF;
END $$;

-- Update existing records to have 'pending' status if NULL
UPDATE public.admin_whitelist SET status = 'pending' WHERE status IS NULL;
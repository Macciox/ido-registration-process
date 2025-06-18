-- Run this SQL directly in the Supabase SQL Editor to fix the admin_whitelist table

-- Check if admin_whitelist table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admin_whitelist'
  ) THEN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
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

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'admin_whitelist'
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.admin_whitelist ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added updated_at column to admin_whitelist table';
    ELSE
      RAISE NOTICE 'updated_at column already exists in admin_whitelist table';
    END IF;

    -- Update existing records to have 'pending' status if NULL
    UPDATE public.admin_whitelist SET status = 'pending' WHERE status IS NULL;
    RAISE NOTICE 'Updated NULL status values to pending';
  ELSE
    RAISE NOTICE 'admin_whitelist table does not exist';
  END IF;
END $$;
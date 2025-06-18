-- Check if media_kit table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'media_kit'
  ) THEN
    -- Add owner_id column to media_kit table
    ALTER TABLE media_kit ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

    -- Update owner_id based on email (if there's an email column)
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'media_kit'
      AND column_name = 'email'
    ) THEN
      UPDATE media_kit mk
      SET owner_id = profiles.id
      FROM profiles
      WHERE mk.email = profiles.email;
    END IF;

    -- Create index on owner_id
    CREATE INDEX IF NOT EXISTS media_kit_owner_id_idx ON media_kit(owner_id);

    -- Create index on project_id if it exists
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'media_kit'
      AND column_name = 'project_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS media_kit_project_id_idx ON media_kit(project_id);
    END IF;

    -- Create index on created_at if it exists
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'media_kit'
      AND column_name = 'created_at'
    ) THEN
      CREATE INDEX IF NOT EXISTS media_kit_created_at_idx ON media_kit(created_at);
    END IF;
  END IF;
END $$;
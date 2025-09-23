-- Create announcement_schedule table
CREATE TABLE announcement_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase VARCHAR(100) NOT NULL,
  post_name VARCHAR(255) NOT NULL,
  twitter BOOLEAN DEFAULT false,
  telegram BOOLEAN DEFAULT false,
  email BOOLEAN DEFAULT false,
  scheduled_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE announcement_schedule ENABLE ROW LEVEL SECURITY;

-- Policy for admins (full access)
CREATE POLICY "Admins can manage all announcement schedules" ON announcement_schedule
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy for project owners (own project only)
CREATE POLICY "Project owners can manage their announcement schedules" ON announcement_schedule
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE owner_id = auth.uid()
    )
  );
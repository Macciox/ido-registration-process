-- Create profiles table to store user roles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'project_owner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create project_fields table for storing all form fields
CREATE TABLE project_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  status TEXT NOT NULL CHECK (status IN ('Confirmed', 'Not Confirmed', 'Might Still Change')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create FAQs table
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL
);

-- Create quiz_questions table
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D'))
);

-- Create RLS policies

-- Profiles table policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin users can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Projects table policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view their own projects"
  ON projects FOR SELECT
  USING (
    owner_email = (
      SELECT email FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin users can view all projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Project fields policies
ALTER TABLE project_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view their own project fields"
  ON project_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_fields.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can update their own project fields"
  ON project_fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_fields.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can insert their own project fields"
  ON project_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_fields.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin users can view all project fields"
  ON project_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update all project fields"
  ON project_fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert all project fields"
  ON project_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Similar policies for FAQs and quiz_questions tables
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view their project FAQs"
  ON faqs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = faqs.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can update their project FAQs"
  ON faqs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = faqs.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can insert their project FAQs"
  ON faqs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = faqs.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can delete their project FAQs"
  ON faqs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = faqs.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin users can view all FAQs"
  ON faqs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update all FAQs"
  ON faqs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert all FAQs"
  ON faqs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete all FAQs"
  ON faqs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view their project quiz questions"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quiz_questions.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can update their project quiz questions"
  ON quiz_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quiz_questions.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can insert their project quiz questions"
  ON quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quiz_questions.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can delete their project quiz questions"
  ON quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quiz_questions.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin users can view all quiz questions"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update all quiz questions"
  ON quiz_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert all quiz questions"
  ON quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete all quiz questions"
  ON quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create media_kit table for branding
CREATE TABLE media_kit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  font_family TEXT,
  banner_image_url TEXT,
  button_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create project_owners table
CREATE TABLE project_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create unique constraint to prevent duplicate owners
ALTER TABLE project_owners ADD CONSTRAINT unique_project_owner UNIQUE (project_id, email);

-- Enable RLS for project_owners
ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;

-- Only admins can view project owners
CREATE POLICY "Admin users can view project owners"
  ON project_owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert project owners
CREATE POLICY "Admin users can insert project owners"
  ON project_owners FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete project owners
CREATE POLICY "Admin users can delete project owners"
  ON project_owners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Media kit policies
ALTER TABLE media_kit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view their project media kit"
  ON media_kit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = media_kit.project_id
      AND projects.owner_email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin users can view all media kits"
  ON media_kit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update media kits"
  ON media_kit FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert media kits"
  ON media_kit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create functions and triggers

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'project_owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a profile when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert default Decuabte Launchpad branding
INSERT INTO media_kit (
  project_id,
  logo_url,
  primary_color,
  secondary_color,
  font_family,
  banner_image_url,
  button_style
) VALUES (
  NULL, -- Replace with specific project_id or NULL for global default
  'https://storage.googleapis.com/your-bucket/decuabte-logo.png', -- Replace with actual logo URL
  '#8A2BE2', -- Primary color (violet)
  '#9370DB', -- Secondary color (medium purple)
  'Poppins, sans-serif',
  'https://storage.googleapis.com/your-bucket/decuabte-background.jpg', -- Replace with actual background URL
  'rounded-lg' -- Default button style
);

-- Create admin_invitations table
CREATE TABLE admin_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for admin_invitations
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view invitations
CREATE POLICY "Admin users can view invitations"
  ON admin_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can create invitations
CREATE POLICY "Admin users can create invitations"
  ON admin_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update invitations
CREATE POLICY "Admin users can update invitations"
  ON admin_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for faster lookups
CREATE INDEX admin_invitations_email_idx ON admin_invitations (email);
CREATE INDEX admin_invitations_token_idx ON admin_invitations (token);
CREATE INDEX project_owners_project_id_idx ON project_owners (project_id);
CREATE INDEX project_owners_email_idx ON project_owners (email);
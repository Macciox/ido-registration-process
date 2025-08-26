-- Compliance System Schema with RLS and Enums

-- Create enums
CREATE TYPE check_status_enum AS ENUM ('FOUND', 'NEEDS_CLARIFICATION', 'MISSING');
CREATE TYPE run_status_enum AS ENUM ('uploaded', 'processing', 'ready', 'error');

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Checker templates (reusable)
CREATE TABLE checker_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whitepaper', 'legal')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checker items (checklist items)
CREATE TABLE checker_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES checker_templates(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  weight DECIMAL DEFAULT 1.0,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance checks (user executions)
CREATE TABLE compliance_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checker_templates(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('pdf', 'url')),
  document_url TEXT,
  document_path TEXT,
  status run_status_enum DEFAULT 'uploaded',
  error_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks with embeddings
CREATE TABLE compliance_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id UUID REFERENCES compliance_checks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  chunk_index INTEGER,
  page INTEGER,
  start_pos INTEGER,
  end_pos INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check results per item
CREATE TABLE check_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id UUID REFERENCES compliance_checks(id) ON DELETE CASCADE,
  item_id UUID REFERENCES checker_items(id) ON DELETE CASCADE,
  status check_status_enum NOT NULL,
  coverage_score INTEGER CHECK (coverage_score >= 0 AND coverage_score <= 100),
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence table (separate from results)
CREATE TABLE compliance_evidences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID REFERENCES check_results(id) ON DELETE CASCADE,
  page INTEGER,
  url TEXT,
  snippet TEXT NOT NULL,
  start_pos INTEGER,
  end_pos INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector index for similarity search
CREATE INDEX compliance_chunks_embedding_idx ON compliance_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create other indexes
CREATE INDEX idx_compliance_checks_user_id ON compliance_checks(user_id);
CREATE INDEX idx_compliance_checks_project_id ON compliance_checks(project_id);
CREATE INDEX idx_compliance_chunks_check_id ON compliance_chunks(check_id);
CREATE INDEX idx_check_results_check_id ON check_results(check_id);
CREATE INDEX idx_compliance_evidences_result_id ON compliance_evidences(result_id);

-- Enable RLS on all tables
ALTER TABLE checker_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checker_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidences ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Templates and items are readable by all authenticated users
CREATE POLICY "Templates are readable by authenticated users" ON checker_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Items are readable by authenticated users" ON checker_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- Compliance checks - owner only
CREATE POLICY "Users can manage their own compliance checks" ON compliance_checks
  FOR ALL USING (auth.uid() = user_id);

-- Chunks - owner only via check
CREATE POLICY "Users can access chunks of their checks" ON compliance_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM compliance_checks 
      WHERE compliance_checks.id = compliance_chunks.check_id 
      AND compliance_checks.user_id = auth.uid()
    )
  );

-- Results - owner only via check
CREATE POLICY "Users can access results of their checks" ON check_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM compliance_checks 
      WHERE compliance_checks.id = check_results.check_id 
      AND compliance_checks.user_id = auth.uid()
    )
  );

-- Evidences - owner only via result->check
CREATE POLICY "Users can access evidences of their results" ON compliance_evidences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM check_results 
      JOIN compliance_checks ON compliance_checks.id = check_results.check_id
      WHERE check_results.id = compliance_evidences.result_id 
      AND compliance_checks.user_id = auth.uid()
    )
  );

-- Admin policies for templates management
CREATE POLICY "Admins can manage templates" ON checker_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage items" ON checker_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Compliance overview view with weighted score
CREATE OR REPLACE VIEW compliance_overview AS
SELECT 
  cc.id,
  cc.user_id,
  cc.project_id,
  cc.status,
  cc.created_at,
  ct.name as template_name,
  ct.type as template_type,
  COALESCE(
    ROUND(
      SUM(cr.coverage_score * ci.weight) / NULLIF(SUM(ci.weight), 0), 2
    ), 0
  ) as overall_score,
  COUNT(cr.id) as total_items,
  COUNT(CASE WHEN cr.status = 'FOUND' THEN 1 END) as found_items,
  COUNT(CASE WHEN cr.status = 'NEEDS_CLARIFICATION' THEN 1 END) as clarification_items,
  COUNT(CASE WHEN cr.status = 'MISSING' THEN 1 END) as missing_items
FROM compliance_checks cc
JOIN checker_templates ct ON ct.id = cc.template_id
LEFT JOIN check_results cr ON cr.check_id = cc.id
LEFT JOIN checker_items ci ON ci.id = cr.item_id
GROUP BY cc.id, cc.user_id, cc.project_id, cc.status, cc.created_at, ct.name, ct.type;

-- RLS for the view
ALTER VIEW compliance_overview SET (security_invoker = true);

-- RPC for similarity search
CREATE OR REPLACE FUNCTION match_chunks(
  check_uuid UUID,
  query_embedding VECTOR(1536),
  k INTEGER DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  page INTEGER,
  start_pos INTEGER,
  end_pos INTEGER,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT 
    compliance_chunks.id,
    compliance_chunks.content,
    compliance_chunks.page,
    compliance_chunks.start_pos,
    compliance_chunks.end_pos,
    1 - (compliance_chunks.embedding <-> query_embedding) AS similarity
  FROM compliance_chunks
  WHERE compliance_chunks.check_id = check_uuid
  ORDER BY compliance_chunks.embedding <-> query_embedding
  LIMIT k;
$$;
-- Add missing columns to compliance_results for legal analysis
ALTER TABLE compliance_results 
ADD COLUMN IF NOT EXISTS field_type TEXT,
ADD COLUMN IF NOT EXISTS scoring_logic TEXT,
ADD COLUMN IF NOT EXISTS selected_answer TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- Create saved_analyses table
CREATE TABLE IF NOT EXISTS saved_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_id UUID REFERENCES compliance_checks(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_saved_analyses_check_id ON saved_analyses(check_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_check_id ON compliance_results(check_id);

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'compliance_results' 
AND column_name IN ('field_type', 'scoring_logic', 'selected_answer', 'risk_score');
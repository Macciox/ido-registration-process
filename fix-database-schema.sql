-- Fix Database Schema per Analisi Legale

-- 1. Aggiungi colonne mancanti a compliance_results
ALTER TABLE compliance_results 
ADD COLUMN IF NOT EXISTS field_type TEXT,
ADD COLUMN IF NOT EXISTS scoring_logic TEXT,
ADD COLUMN IF NOT EXISTS selected_answer TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- 2. Crea tabella saved_analyses se non esiste
CREATE TABLE IF NOT EXISTS saved_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_id UUID REFERENCES compliance_checks(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_saved_analyses_check_id ON saved_analyses(check_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_check_id ON compliance_results(check_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_item_id ON compliance_results(item_id);

-- 4. Verifica che il template legale esista
SELECT 
    t.id, 
    t.name, 
    t.type,
    COUNT(i.id) as item_count
FROM checker_templates t
LEFT JOIN checker_items i ON t.id = i.template_id
WHERE t.type = 'legal'
GROUP BY t.id, t.name, t.type;
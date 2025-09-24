-- =====================================================
-- COMPLETE DATABASE FIX SCRIPT
-- Fixes all identified issues in the IDO Platform
-- =====================================================

-- FASE 1: Fix Schema Database
-- =====================================================

-- 1. Fix compliance_results per analisi legale
ALTER TABLE compliance_results 
ADD COLUMN IF NOT EXISTS field_type TEXT,
ADD COLUMN IF NOT EXISTS scoring_logic TEXT,
ADD COLUMN IF NOT EXISTS selected_answer TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- 2. Crea tabella saved_analyses
CREATE TABLE IF NOT EXISTS saved_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_id UUID REFERENCES compliance_checks(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fix relazioni profiles con auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN EXISTS (SELECT 1 FROM admin_whitelist WHERE email = NEW.email) THEN 'admin'
      ELSE 'project_owner'
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per nuovi utenti
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_compliance_results_check_id ON compliance_results(check_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_item_id ON compliance_results(item_id);
CREATE INDEX IF NOT EXISTS idx_compliance_chunks_document_id ON compliance_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_user_id ON compliance_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_project_id ON compliance_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_check_id ON saved_analyses(check_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- FASE 2: Popolare Template Legale
-- =====================================================

-- Disabilita temporaneamente RLS per inserire gli item
ALTER TABLE checker_items DISABLE ROW LEVEL SECURITY;

-- Inserisci 21 item legali MiCA (solo se non esistono già)
INSERT INTO checker_items (template_id, category, item_name, description, weight, sort_order, field_type, scoring_logic) 
SELECT * FROM (VALUES
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Rights similar to shares/bonds', 'Does the token provide rights similar to shares or bonds?', 1.0, 1, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Profit sharing rights', 'Does the token provide profit sharing or dividend rights?', 1.0, 2, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Voting rights', 'Does the token provide voting rights in the issuer?', 1.0, 3, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Repayment obligation', 'Does the token create a repayment obligation for the issuer?', 1.0, 4, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Interest payments', 'Does the token provide for interest or similar payments?', 1.0, 5, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Stablecoin Requirements', 'Single currency peg', 'Is the token pegged to a single fiat currency?', 1.0, 6, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Stablecoin Requirements', 'Basket of currencies', 'Is the token pegged to a basket of fiat currencies?', 1.0, 7, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Stablecoin Requirements', 'Commodity reference', 'Is the token referenced to commodities or other assets?', 1.0, 8, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Stablecoin Requirements', 'Algorithmic stabilization', 'Does the token use algorithmic mechanisms for price stability?', 1.0, 9, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Issuer Requirements', 'Registered legal entity', 'Is the issuer a registered legal entity in the EU?', 1.0, 10, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Issuer Requirements', 'MiCA authorization', 'Does the issuer have or require MiCA authorization?', 1.0, 11, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Issuer Requirements', 'Minimum capital', 'Does the issuer meet minimum capital requirements?', 1.0, 12, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Compliance Obligations', 'Whitepaper publication', 'Is there an obligation to publish a crypto-asset whitepaper?', 1.0, 13, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Compliance Obligations', 'Notification requirements', 'Are there notification requirements to competent authorities?', 1.0, 14, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Compliance Obligations', 'Marketing restrictions', 'Are there marketing and advertising restrictions?', 1.0, 15, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Market manipulation risk', 'Is there risk of market manipulation?', 1.0, 16, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Money laundering risk', 'Is there anti-money laundering compliance risk?', 1.0, 17, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Consumer protection risk', 'Are there consumer protection concerns?', 1.0, 18, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Exemptions', 'Small offering exemption', 'Does the offering qualify for small offering exemptions?', 1.0, 19, 'Yes/No', 'Yes = 0, No = 1000'),
('550e8400-e29b-41d4-a716-446655440002', 'Exemptions', 'Utility token exemption', 'Does the token qualify as a utility token exemption?', 1.0, 20, 'Yes/No', 'Yes = 0, No = 1000'),
('550e8400-e29b-41d4-a716-446655440002', 'Exemptions', 'DeFi protocol exemption', 'Does the token qualify for DeFi protocol exemptions?', 1.0, 21, 'Yes/No', 'Yes = 0, No = 1000')
) AS new_items(template_id, category, item_name, description, weight, sort_order, field_type, scoring_logic)
WHERE NOT EXISTS (
    SELECT 1 FROM checker_items 
    WHERE template_id = '550e8400-e29b-41d4-a716-446655440002' 
    AND item_name = new_items.item_name
);

-- Riabilita RLS
ALTER TABLE checker_items ENABLE ROW LEVEL SECURITY;

-- FASE 3: Fix Sicurezza RLS
-- =====================================================

-- 1. Policy per compliance_documents
DROP POLICY IF EXISTS "Users can view own documents" ON compliance_documents;
CREATE POLICY "Users can view own documents" ON compliance_documents
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON compliance_documents;
CREATE POLICY "Users can insert own documents" ON compliance_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON compliance_documents;
CREATE POLICY "Users can update own documents" ON compliance_documents
    FOR UPDATE USING (auth.uid() = user_id);

-- 2. Policy per compliance_results
DROP POLICY IF EXISTS "Users can view own analysis results" ON compliance_results;
CREATE POLICY "Users can view own analysis results" ON compliance_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM compliance_checks cc 
            WHERE cc.id = compliance_results.check_id 
            AND cc.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own analysis results" ON compliance_results;
CREATE POLICY "Users can insert own analysis results" ON compliance_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM compliance_checks cc 
            WHERE cc.id = compliance_results.check_id 
            AND cc.user_id = auth.uid()
        )
    );

-- 3. Policy per compliance_checks
DROP POLICY IF EXISTS "Users can view own checks" ON compliance_checks;
CREATE POLICY "Users can view own checks" ON compliance_checks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own checks" ON compliance_checks;
CREATE POLICY "Users can insert own checks" ON compliance_checks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own checks" ON compliance_checks;
CREATE POLICY "Users can update own checks" ON compliance_checks
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Policy per compliance_chunks
DROP POLICY IF EXISTS "Users can view own chunks" ON compliance_chunks;
CREATE POLICY "Users can view own chunks" ON compliance_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM compliance_checks cc 
            WHERE cc.id = compliance_chunks.check_id 
            AND cc.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM compliance_documents cd 
            WHERE cd.id = compliance_chunks.document_id 
            AND cd.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own chunks" ON compliance_chunks;
CREATE POLICY "Users can insert own chunks" ON compliance_chunks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM compliance_checks cc 
            WHERE cc.id = compliance_chunks.check_id 
            AND cc.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM compliance_documents cd 
            WHERE cd.id = compliance_chunks.document_id 
            AND cd.user_id = auth.uid()
        )
    );

-- 5. Policy per saved_analyses
DROP POLICY IF EXISTS "Users can view own saved analyses" ON saved_analyses;
CREATE POLICY "Users can view own saved analyses" ON saved_analyses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM compliance_checks cc 
            WHERE cc.id = saved_analyses.check_id 
            AND cc.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own saved analyses" ON saved_analyses;
CREATE POLICY "Users can insert own saved analyses" ON saved_analyses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM compliance_checks cc 
            WHERE cc.id = saved_analyses.check_id 
            AND cc.user_id = auth.uid()
        )
    );

-- 6. Abilita RLS su tutte le tabelle
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_analyses ENABLE ROW LEVEL SECURITY;

-- FASE 4: Fix Storage Bucket Policies
-- =====================================================
-- NOTA: Queste policy devono essere create tramite Supabase Dashboard
-- Storage → compliance-documents → Policies

/*
-- Policy per upload documenti compliance
CREATE POLICY "Users can upload own compliance documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'compliance-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy per visualizzare documenti compliance
CREATE POLICY "Users can view own compliance documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'compliance-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy per eliminare documenti compliance
CREATE POLICY "Users can delete own compliance documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'compliance-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- FASE 5: Verifica e Cleanup
-- =====================================================

-- Verifica che il template legale abbia 21 item
DO $$
DECLARE
    item_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO item_count 
    FROM checker_items 
    WHERE template_id = '550e8400-e29b-41d4-a716-446655440002';
    
    RAISE NOTICE 'Legal template has % items (should be 21)', item_count;
    
    IF item_count != 21 THEN
        RAISE WARNING 'Legal template does not have exactly 21 items!';
    END IF;
END $$;

-- Verifica che le colonne siano state aggiunte
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_results' 
        AND column_name = 'field_type'
    ) THEN
        RAISE WARNING 'field_type column was not added to compliance_results!';
    ELSE
        RAISE NOTICE 'compliance_results schema updated successfully';
    END IF;
END $$;

-- Mostra statistiche finali
SELECT 
    'Database Fix Complete' as status,
    (SELECT COUNT(*) FROM checker_items WHERE template_id = '550e8400-e29b-41d4-a716-446655440002') as legal_items,
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM compliance_documents) as total_documents,
    (SELECT COUNT(*) FROM compliance_checks) as total_analyses;

RAISE NOTICE 'Database fix script completed successfully!';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Create storage policies in Supabase Dashboard';
RAISE NOTICE '2. Test legal analysis functionality';
RAISE NOTICE '3. Verify RLS policies are working';
RAISE NOTICE '4. Update environment variables in code';
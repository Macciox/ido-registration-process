# 🔧 Fix per Analisi Legale - "21 Missing"

## 🔍 **PROBLEMI IDENTIFICATI**

### **1. Template Legale Vuoto**
- Il template "Legal Opinion MiCA v1" (`550e8400-e29b-41d4-a716-446655440002`) **non ha item**
- Questo causa sempre "21 Missing" perché non ci sono domande da analizzare

### **2. Schema Database Inconsistente**
- `compliance_results` non ha colonne `field_type`, `scoring_logic`, `selected_answer`
- Il codice cerca queste colonne ma non esistono

### **3. Risultati Non Persistiti**
- Le analisi vengono generate ma non salvate correttamente nel database

## 🛠️ **SOLUZIONI IMMEDIATE**

### **Soluzione 1: Popolare Template Legale**
Esegui questo SQL nel database Supabase:

```sql
-- Disabilita temporaneamente RLS per inserire gli item
ALTER TABLE checker_items DISABLE ROW LEVEL SECURITY;

-- Inserisci i 21 item legali
INSERT INTO checker_items (template_id, category, item_name, description, weight, sort_order, field_type, scoring_logic) VALUES
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
('550e8400-e29b-41d4-a716-446655440002', 'Exemptions', 'DeFi protocol exemption', 'Does the token qualify for DeFi protocol exemptions?', 1.0, 21, 'Yes/No', 'Yes = 0, No = 1000');

-- Riabilita RLS
ALTER TABLE checker_items ENABLE ROW LEVEL SECURITY;
```

### **Soluzione 2: Fix Schema Database**
Aggiungi colonne mancanti a `compliance_results`:

```sql
-- Aggiungi colonne mancanti per l'analisi legale
ALTER TABLE compliance_results 
ADD COLUMN IF NOT EXISTS field_type TEXT,
ADD COLUMN IF NOT EXISTS scoring_logic TEXT,
ADD COLUMN IF NOT EXISTS selected_answer TEXT;
```

### **Soluzione 3: Crea Tabella saved_analyses**
```sql
-- Crea tabella per salvare le analisi
CREATE TABLE IF NOT EXISTS saved_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_id UUID REFERENCES compliance_checks(id),
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🧪 **COME TESTARE**

1. **Esegui gli SQL sopra nel database Supabase**
2. **Verifica che il template abbia 21 item:**
   ```sql
   SELECT COUNT(*) FROM checker_items 
   WHERE template_id = '550e8400-e29b-41d4-a716-446655440002';
   ```
3. **Testa una nuova analisi legale**
4. **Verifica che i risultati vengano salvati correttamente**

## 📊 **RISULTATO ATTESO**

Dopo il fix:
- ✅ Template legale avrà 21 domande
- ✅ Analisi legale funzionerà correttamente  
- ✅ Risultati verranno salvati nel database
- ✅ Non più "21 Missing" costante
- ✅ Scoring corretto basato sulle risposte

## 🔄 **PROSSIMI PASSI**

1. Esegui i fix SQL
2. Testa l'analisi legale
3. Verifica che i risultati siano corretti
4. Controlla che il whitepaper analysis funzioni ancora
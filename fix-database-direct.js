// Direct database fix script using Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gitxgpwxxutrdvdirdke.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHhncHd4eHV0cmR2ZGlyZGtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAyNDQ2MywiZXhwIjoyMDY1NjAwNDYzfQ.coOsEQG0ETuu9sq4r8pI5Lr1EB0EAuGEBVswdeN87TI'
);

async function fixDatabase() {
  console.log('🔧 Fixing Whitepaper & Legal Document Checker Database...');

  // 1. Add missing columns to compliance_results
  console.log('📝 Adding missing columns to compliance_results...');
  const { error: schemaError } = await supabase.rpc('exec', {
    sql: `
      ALTER TABLE compliance_results 
      ADD COLUMN IF NOT EXISTS field_type TEXT,
      ADD COLUMN IF NOT EXISTS scoring_logic TEXT,
      ADD COLUMN IF NOT EXISTS selected_answer TEXT,
      ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
    `
  });
  
  if (schemaError) {
    console.error('❌ Schema fix failed:', schemaError);
  } else {
    console.log('✅ Schema updated successfully');
  }

  // 2. Populate Legal Template with 21 MiCA compliance questions
  console.log('📋 Adding 21 MiCA legal compliance questions...');
  
  const legalItems = [
    { category: 'Token Classification', item_name: 'Rights similar to shares/bonds', description: 'Does the token provide rights similar to shares or bonds?', sort_order: 1, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Token Classification', item_name: 'Profit sharing rights', description: 'Does the token provide profit sharing or dividend rights?', sort_order: 2, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Token Classification', item_name: 'Voting rights', description: 'Does the token provide voting rights in the issuer?', sort_order: 3, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Token Classification', item_name: 'Repayment obligation', description: 'Does the token create a repayment obligation for the issuer?', sort_order: 4, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Token Classification', item_name: 'Interest payments', description: 'Does the token provide for interest or similar payments?', sort_order: 5, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Stablecoin Requirements', item_name: 'Single currency peg', description: 'Is the token pegged to a single fiat currency?', sort_order: 6, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Stablecoin Requirements', item_name: 'Basket of currencies', description: 'Is the token pegged to a basket of fiat currencies?', sort_order: 7, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Stablecoin Requirements', item_name: 'Commodity reference', description: 'Is the token referenced to commodities or other assets?', sort_order: 8, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Stablecoin Requirements', item_name: 'Algorithmic stabilization', description: 'Does the token use algorithmic mechanisms for price stability?', sort_order: 9, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Issuer Requirements', item_name: 'Registered legal entity', description: 'Is the issuer a registered legal entity in the EU?', sort_order: 10, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Issuer Requirements', item_name: 'MiCA authorization', description: 'Does the issuer have or require MiCA authorization?', sort_order: 11, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Issuer Requirements', item_name: 'Minimum capital', description: 'Does the issuer meet minimum capital requirements?', sort_order: 12, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Compliance Obligations', item_name: 'Whitepaper publication', description: 'Is there an obligation to publish a crypto-asset whitepaper?', sort_order: 13, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Compliance Obligations', item_name: 'Notification requirements', description: 'Are there notification requirements to competent authorities?', sort_order: 14, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Compliance Obligations', item_name: 'Marketing restrictions', description: 'Are there marketing and advertising restrictions?', sort_order: 15, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Risk Assessment', item_name: 'Market manipulation risk', description: 'Is there risk of market manipulation?', sort_order: 16, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Risk Assessment', item_name: 'Money laundering risk', description: 'Is there anti-money laundering compliance risk?', sort_order: 17, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Risk Assessment', item_name: 'Consumer protection risk', description: 'Are there consumer protection concerns?', sort_order: 18, scoring_logic: 'Yes = 1000, No = 0' },
    { category: 'Exemptions', item_name: 'Small offering exemption', description: 'Does the offering qualify for small offering exemptions?', sort_order: 19, scoring_logic: 'Yes = 0, No = 1000' },
    { category: 'Exemptions', item_name: 'Utility token exemption', description: 'Does the token qualify as a utility token exemption?', sort_order: 20, scoring_logic: 'Yes = 0, No = 1000' },
    { category: 'Exemptions', item_name: 'DeFi protocol exemption', description: 'Does the token qualify for DeFi protocol exemptions?', sort_order: 21, scoring_logic: 'Yes = 0, No = 1000' }
  ];

  // Insert legal items
  for (const item of legalItems) {
    const { error } = await supabase
      .from('checker_items')
      .upsert({
        template_id: '550e8400-e29b-41d4-a716-446655440002',
        category: item.category,
        item_name: item.item_name,
        description: item.description,
        weight: 1.0,
        sort_order: item.sort_order,
        field_type: 'Yes/No',
        scoring_logic: item.scoring_logic
      }, { 
        onConflict: 'template_id,item_name',
        ignoreDuplicates: true 
      });

    if (error) {
      console.error(`❌ Failed to add item: ${item.item_name}`, error);
    }
  }

  // 3. Verify legal template
  const { data: legalCount, error: countError } = await supabase
    .from('checker_items')
    .select('id', { count: 'exact' })
    .eq('template_id', '550e8400-e29b-41d4-a716-446655440002');

  if (countError) {
    console.error('❌ Failed to verify legal template:', countError);
  } else {
    console.log(`✅ Legal template now has ${legalCount?.length || 0} items (should be 21)`);
  }

  // 4. Create saved_analyses table
  console.log('📊 Creating saved_analyses table...');
  const { error: tableError } = await supabase.rpc('exec', {
    sql: `
      CREATE TABLE IF NOT EXISTS saved_analyses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        check_id UUID REFERENCES compliance_checks(id) ON DELETE CASCADE,
        analysis_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_saved_analyses_check_id ON saved_analyses(check_id);
    `
  });

  if (tableError) {
    console.error('❌ Failed to create saved_analyses table:', tableError);
  } else {
    console.log('✅ saved_analyses table created');
  }

  console.log('🎉 Database fix completed!');
  console.log('📋 Next steps:');
  console.log('1. Test legal document analysis');
  console.log('2. Test whitepaper analysis');
  console.log('3. Verify document upload security');
}

// Run the fix
fixDatabase().catch(console.error);
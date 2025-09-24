// Simple fix using direct INSERT
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gitxgpwxxutrdvdirdke.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHhncHd4eHV0cmR2ZGlyZGtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAyNDQ2MywiZXhwIjoyMDY1NjAwNDYzfQ.coOsEQG0ETuu9sq4r8pI5Lr1EB0EAuGEBVswdeN87TI'
);

async function quickFix() {
  console.log('🔧 Quick Fix for Whitepaper & Legal Document Checker...');

  // Check current legal template status
  const { data: legalItems, error } = await supabase
    .from('checker_items')
    .select('*')
    .eq('template_id', '550e8400-e29b-41d4-a716-446655440002')
    .order('sort_order');

  if (error) {
    console.error('❌ Error checking legal template:', error);
    return;
  }

  console.log(`✅ Legal template has ${legalItems?.length || 0} items`);
  
  if (legalItems && legalItems.length > 0) {
    console.log('📋 Legal template items:');
    legalItems.forEach((item, i) => {
      console.log(`${i + 1}. ${item.item_name} (${item.category})`);
    });
  }

  // Check compliance_results schema
  const { data: sampleResult } = await supabase
    .from('compliance_results')
    .select('*')
    .limit(1)
    .single();

  console.log('📊 compliance_results columns:', Object.keys(sampleResult || {}));

  // Check recent analyses
  const { data: recentChecks } = await supabase
    .from('compliance_checks')
    .select('*')
    .eq('template_name', 'Legal Opinion MiCA v1')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log(`📈 Recent legal analyses: ${recentChecks?.length || 0}`);
  if (recentChecks && recentChecks.length > 0) {
    recentChecks.forEach(check => {
      console.log(`- ${check.document_name}: ${check.missing_items} missing, ${check.found_items} found`);
    });
  }

  console.log('✅ System status check completed!');
}

quickFix().catch(console.error);
// Test script for Whitepaper & Legal Document Checker
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gitxgpwxxutrdvdirdke.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHhncHd4eHV0cmR2ZGlyZGtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAyNDQ2MywiZXhwIjoyMDY1NjAwNDYzfQ.coOsEQG0ETuu9sq4r8pI5Lr1EB0EAuGEBVswdeN87TI'
);

async function testSystem() {
  console.log('🧪 Testing Whitepaper & Legal Document Checker System...\n');

  // 1. Test Templates
  console.log('📋 Testing Templates...');
  const { data: templates } = await supabase
    .from('checker_templates')
    .select('*');
  
  console.log(`✅ Found ${templates?.length || 0} templates:`);
  templates?.forEach(t => console.log(`  - ${t.name} (${t.type})`));

  // 2. Test Legal Template Items
  console.log('\n⚖️ Testing Legal Template Items...');
  const { data: legalItems } = await supabase
    .from('checker_items')
    .select('*')
    .eq('template_id', '550e8400-e29b-41d4-a716-446655440002')
    .order('sort_order');

  console.log(`✅ Legal template has ${legalItems?.length || 0} items (should be 21)`);
  if (legalItems && legalItems.length > 0) {
    console.log('  Categories:');
    const categories = [...new Set(legalItems.map(item => item.category))];
    categories.forEach(cat => {
      const count = legalItems.filter(item => item.category === cat).length;
      console.log(`    - ${cat}: ${count} items`);
    });
  }

  // 3. Test Whitepaper Template Items
  console.log('\n📄 Testing Whitepaper Template Items...');
  const { data: whitepaperItems } = await supabase
    .from('checker_items')
    .select('*')
    .eq('template_id', '550e8400-e29b-41d4-a716-446655440001')
    .order('sort_order');

  console.log(`✅ Whitepaper template has ${whitepaperItems?.length || 0} items`);

  // 4. Test Users and Authentication
  console.log('\n👥 Testing Users...');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  console.log(`✅ Found ${profiles?.length || 0} registered users:`);
  profiles?.forEach(p => console.log(`  - ${p.email} (${p.role})`));

  // 5. Test Documents
  console.log('\n📁 Testing Documents...');
  const { data: documents } = await supabase
    .from('compliance_documents')
    .select('*')
    .neq('mime_type', 'text/html')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`✅ Found ${documents?.length || 0} recent documents:`);
  documents?.forEach(d => console.log(`  - ${d.filename} (${d.processing_status})`));

  // 6. Test Storage Buckets
  console.log('\n🗄️ Testing Storage...');
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log(`✅ Found ${buckets?.length || 0} storage buckets:`);
  buckets?.forEach(b => console.log(`  - ${b.name} (${b.public ? 'public' : 'private'})`));

  // 7. Test Recent Analyses
  console.log('\n📊 Testing Recent Analyses...');
  const { data: analyses } = await supabase
    .from('compliance_checks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`✅ Found ${analyses?.length || 0} recent analyses:`);
  analyses?.forEach(a => {
    console.log(`  - ${a.template_name}: ${a.found_items} found, ${a.missing_items} missing, ${a.clarification_items} need clarification`);
  });

  // 8. System Health Summary
  console.log('\n🎯 System Health Summary:');
  console.log(`  Templates: ${templates?.length || 0}/2 expected`);
  console.log(`  Legal Items: ${legalItems?.length || 0}/21 expected`);
  console.log(`  Users: ${profiles?.length || 0} registered`);
  console.log(`  Documents: ${documents?.length || 0} uploaded`);
  console.log(`  Analyses: ${analyses?.length || 0} completed`);

  // 9. Check for "21 Missing" issue
  const problematicAnalyses = analyses?.filter(a => 
    a.template_name === 'Legal Opinion MiCA v1' && 
    a.missing_items === 21 && 
    a.found_items === 0
  );

  if (problematicAnalyses && problematicAnalyses.length > 0) {
    console.log(`\n⚠️ Found ${problematicAnalyses.length} analyses with "21 Missing" issue`);
    console.log('   This indicates the legal analysis is not working properly');
  } else {
    console.log('\n✅ No "21 Missing" issues detected');
  }

  console.log('\n🎉 System test completed!');
}

testSystem().catch(console.error);
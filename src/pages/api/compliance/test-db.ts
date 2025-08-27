import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test 1: Check if compliance_checks table exists
    const { data: tables, error: tablesError } = await serviceClient
      .from('compliance_checks')
      .select('*')
      .limit(1);

    if (tablesError) {
      return res.status(500).json({ 
        error: 'Table access failed', 
        details: tablesError,
        step: 'table_access'
      });
    }

    // Test 2: Try simple insert
    const testData = {
      document_id: '550e8400-e29b-41d4-a716-446655440000', // fake UUID
      template_id: '550e8400-e29b-41d4-a716-446655440001',  // fake UUID
      status: 'processing'
    };

    const { data: insertResult, error: insertError } = await serviceClient
      .from('compliance_checks')
      .insert(testData)
      .select();

    if (insertError) {
      return res.status(500).json({ 
        error: 'Insert failed', 
        details: insertError,
        step: 'insert_test',
        attempted_data: testData
      });
    }

    // Clean up test data
    if (insertResult?.[0]?.id) {
      await serviceClient
        .from('compliance_checks')
        .delete()
        .eq('id', insertResult[0].id);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Database test passed',
      table_accessible: true,
      insert_works: true
    });

  } catch (error: any) {
    res.status(500).json({ 
      error: 'Unexpected error', 
      message: error.message,
      step: 'catch_block'
    });
  }
}
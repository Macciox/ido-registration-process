import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Test 1: List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return res.status(500).json({ 
        error: 'Cannot list buckets', 
        details: bucketsError 
      });
    }

    // Test 2: Check if compliance-documents bucket exists
    const complianceBucket = buckets.find(b => b.name === 'compliance-documents');
    
    if (!complianceBucket) {
      return res.status(404).json({ 
        error: 'compliance-documents bucket not found',
        availableBuckets: buckets.map(b => b.name)
      });
    }

    // Test 3: List files in bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('compliance-documents')
      .list('whitepapers', {
        limit: 10,
        offset: 0
      });

    if (filesError) {
      return res.status(500).json({ 
        error: 'Cannot list files', 
        details: filesError 
      });
    }

    // Test 4: Test database connection
    const { data: templates, error: dbError } = await supabase
      .from('checker_templates')
      .select('id, name, type')
      .limit(5);

    if (dbError) {
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: dbError 
      });
    }

    res.status(200).json({
      success: true,
      tests: {
        storage: {
          bucketsCount: buckets.length,
          complianceBucketExists: !!complianceBucket,
          filesInWhitepapers: files?.length || 0
        },
        database: {
          templatesCount: templates?.length || 0,
          templates: templates?.map(t => ({ id: t.id, name: t.name, type: t.type }))
        }
      },
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error: any) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
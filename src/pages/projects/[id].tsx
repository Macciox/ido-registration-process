import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import Tabs from '@/components/ui/Tabs';
import TokenInfoForm from '@/components/forms/TokenInfoForm';
import PlatformSetupForm from '@/components/forms/PlatformSetupForm';
import PublicRoundForm from '@/components/forms/PublicRoundForm';
import MarketingKitForm from '@/components/forms/MarketingKitForm';
import FAQForm from '@/components/forms/FAQForm';
import L2EQuizForm from '@/components/forms/L2EQuizForm';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { initializeFormFields } from '@/lib/formDefaults';

const ProjectPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabCompletions, setTabCompletions] = useState<{[key: string]: number}>({});
  
  // Tabs configuration
  const tabs = [
    { id: 'token-info', label: 'Token Info' },
    { id: 'platform-setup', label: 'Platform Setup' },
    { id: 'public-round', label: 'IDO Metrics' },
    { id: 'marketing-kit', label: 'Marketing Kit' },
    { id: 'faq', label: 'FAQ' },
    { id: 'l2e-quiz', label: 'L2E Quiz' },
  ];
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);
  
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Load project details
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
        
        if (projectError) {
          console.error('Error loading project:', projectError);
          setError('Project not found');
          return;
        }
        
        setProjectName(project.name);
        
        // Initialize all form fields with 'Not Confirmed' status
        const allFieldIds = [
          // Token Info fields
          'initialMarketCapExLiquidity', 'initialMarketCap', 'fullyDilutedMarketCap',
          'circulatingSupplyAtTge', 'tgeSupplyPercentage', 'totalSupply',
          
          // Platform Setup fields
          'tagline', 'projectDescription', 'telegram', 'twitter', 'discord',
          'youtube', 'linkedin', 'tokenomicsFile', 'teamPage', 'roadmapPage',
          
          // Public Round fields
          'whitelistingStartTime', 'idoLaunchDate', 'tokenClaimingDate', 'cexDexListingDate',
          'allocationUSD', 'allocationTokenAmount', 'tokenPrice', 'tgeUnlockPercentage',
          'cliffLock', 'vestingDuration', 'tokenTicker', 'network', 'gracePeriod',
          'minimumTier', 'tokenContractAddress', 'tokenTransferTxId',
          
          // Marketing Kit fields
          'marketingKitUrl'
        ];
        
        await initializeFormFields(supabase, id as string, allFieldIds);
        
        // Calculate completion percentages for all tabs
        await calculateAllTabCompletions(id as string);
        
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadProject();
    }
  }, [id]);
  
  // Calculate completion percentages for all tabs
  const calculateAllTabCompletions = async (projectId: string) => {
    try {
      // Get all project fields
      const { data: allFields, error } = await supabase
        .from('project_fields')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) {
        console.error('Error loading project fields:', error);
        return;
      }
      
      // Define fields for each tab
      const tabFields = {
        'token-info': [
          'initialMarketCapExLiquidity', 'initialMarketCap', 'fullyDilutedMarketCap',
          'circulatingSupplyAtTge', 'tgeSupplyPercentage', 'totalSupply'
        ],
        'platform-setup': [
          'tagline', 'projectDescription', 'telegram', 'twitter', 'discord',
          'youtube', 'linkedin', 'tokenomicsFile', 'teamPage', 'roadmapPage'
        ],
        'public-round': [
          'whitelistingStartTime', 'idoLaunchDate', 'tokenClaimingDate', 'cexDexListingDate',
          'allocationUSD', 'allocationTokenAmount', 'tokenPrice', 'tgeUnlockPercentage',
          'cliffLock', 'vestingDuration', 'tokenTicker', 'network', 'gracePeriod',
          'minimumTier', 'tokenContractAddress', 'tokenTransferTxId'
        ],
        'marketing-kit': ['marketingKitUrl']
      };
      
      // Calculate completion percentage for each tab
      const newTabCompletions: {[key: string]: number} = {};
      
      // Process each tab
      for (const [tabId, fields] of Object.entries(tabFields)) {
        const tabFieldsData = allFields?.filter(field => fields.includes(field.field_name)) || [];
        const confirmedFields = tabFieldsData.filter(field => field.status === 'Confirmed').length;
        const totalFields = fields.length;
        const percentage = Math.round((confirmedFields / totalFields) * 100);
        
        newTabCompletions[tabId] = percentage;
      }
      
      // Calculate FAQ completion
      const { data: faqData, error: faqError } = await supabase
        .from('faqs')
        .select('count')
        .eq('project_id', projectId);
        
      if (!faqError && faqData) {
        const faqCount = faqData.length;
        newTabCompletions['faq'] = faqCount > 0 ? 100 : 0;
      }
      
      // Calculate L2E Quiz completion
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_questions')
        .select('count')
        .eq('project_id', projectId);
        
      if (!quizError && quizData) {
        const quizCount = quizData.length;
        newTabCompletions['l2e-quiz'] = quizCount > 0 ? 100 : 0;
      }
      
      // Update tab completions state
      setTabCompletions(newTabCompletions);
      
    } catch (err) {
      console.error('Error calculating tab completions:', err);
    }
  };
  
  const handleTabCompletionUpdate = (tabId: string, percentage: number) => {
    setTabCompletions(prev => ({
      ...prev,
      [tabId]: percentage
    }));
  };
  
  const renderTabContent = (activeTab: string) => {
    if (!id) return null;
    
    switch (activeTab) {
      case 'token-info':
        return <TokenInfoForm projectId={id as string} onCompletionUpdate={handleTabCompletionUpdate} />;
      case 'platform-setup':
        return <PlatformSetupForm projectId={id as string} onCompletionUpdate={handleTabCompletionUpdate} />;
      case 'public-round':
        return <PublicRoundForm projectId={id as string} onCompletionUpdate={handleTabCompletionUpdate} />;
      case 'marketing-kit':
        return <MarketingKitForm projectId={id as string} onCompletionUpdate={handleTabCompletionUpdate} />;
      case 'faq':
        return <FAQForm projectId={id as string} onCompletionUpdate={handleTabCompletionUpdate} />;
      case 'l2e-quiz':
        return <L2EQuizForm projectId={id as string} onCompletionUpdate={handleTabCompletionUpdate} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold project-name">{projectName}</h1>
                  <p className="text-text-secondary">Complete the following information for your project</p>
                </div>
                
                <div className="mt-4 md:mt-0">
                  <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="btn-light flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
            
            <Tabs 
              tabs={tabs.map(tab => ({
                ...tab,
                completion: tabCompletions[tab.id] || 0
              }))} 
              renderContent={renderTabContent}
              defaultTab="token-info"
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default ProjectPage;
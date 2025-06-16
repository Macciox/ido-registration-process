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
import ProjectCompletionBar from '@/components/ui/ProjectCompletionBar';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { initializeFormFields } from '@/lib/formDefaults';

const ProjectPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [projectName, setProjectName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
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
        
        setIsAdmin(user.role === 'admin');
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{projectName}</h1>
                  <p className="text-gray-600">Complete the following information for your project</p>
                  {id && <ProjectCompletionBar projectId={id as string} />}
                </div>
                <div className="flex space-x-4">
                  {isAdmin && (
                    <button
                      onClick={() => router.push(`/projects/${id}/owners`)}
                      className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors"
                    >
                      Manage Owners
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Tabs 
                tabs={tabs.map(tab => ({
                  ...tab,
                  completion: tabCompletions[tab.id] || 0
                }))} 
                renderContent={renderTabContent}
                defaultTab="token-info"
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ProjectPage;
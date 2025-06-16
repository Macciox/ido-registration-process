import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import Tabs from '@/components/ui/Tabs';
import PublicRoundForm from '@/components/forms/PublicRoundForm';
import TokenInfoForm from '@/components/forms/TokenInfoForm';
import PlatformSetupForm from '@/components/forms/PlatformSetupForm';
import FAQForm from '@/components/forms/FAQForm';
import L2EQuizForm from '@/components/forms/L2EQuizForm';
import MarketingKitForm from '@/components/forms/MarketingKitForm';
import { getCurrentUser } from '@/lib/auth';
import { getProjectById, getProjectByOwnerEmail } from '@/lib/projects';
import { User, Project } from '@/types/database.types';
import { supabase } from '@/lib/supabase';

const tabs = [
  { id: 'public-round', label: 'IDO Metrics' },
  { id: 'token-info', label: 'Token Info' },
  { id: 'platform-setup', label: 'Platform Setup' },
  { id: 'faq', label: 'FAQ' },
  { id: 'l2e-quiz', label: 'L2E Quiz' },
  { id: 'marketing-kit', label: 'Marketing Kit' },
];

const ProjectPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('public-round');
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabCompletionPercentages, setTabCompletionPercentages] = useState<{[key: string]: number}>({
    'public-round': 0,
    'token-info': 0,
    'platform-setup': 0,
    'faq': 0,
    'l2e-quiz': 0,
    'marketing-kit': 0
  });
  const [overallCompletion, setOverallCompletion] = useState(0);
  
  const router = useRouter();
  const { id } = router.query;
  
  useEffect(() => {
    const checkAuthAndLoadProject = async () => {
      if (!id) return;
      
      try {
        // Check authentication
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        setUser(currentUser);
        
        // Load project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id as string)
          .single();
        
        if (projectError) {
          setError(projectError.message);
          return;
        }
        
        if (!projectData) {
          setError('Project not found');
          return;
        }
        
        // Check if user has access to this project
        if (currentUser.role !== 'admin' && projectData.owner_email !== currentUser.email) {
          // User doesn't have access to this project
          setError('You do not have permission to view this project');
          return;
        }
        
        setProject(projectData);
      } catch (err) {
        console.error('Error loading project:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndLoadProject();
  }, [id, router]);
  
  // Handle completion percentage updates from child components
  const handleCompletionUpdate = (tabId: string, percentage: number) => {
    setTabCompletionPercentages(prev => {
      const newPercentages = { ...prev, [tabId]: percentage };
      
      // Calculate overall completion
      const totalPercentage = Object.values(newPercentages).reduce((sum, value) => sum + value, 0);
      const overallPercentage = Math.round(totalPercentage / tabs.length);
      setOverallCompletion(overallPercentage);
      
      return newPercentages;
    });
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">Loading project...</div>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              Error: {error}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">{project?.name}</h1>
            <div className="flex items-center">
              <div className="mr-3 text-sm font-medium">
                Overall Completion: {overallCompletion}%
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-secondary h-2.5 rounded-full" 
                  style={{ width: `${overallCompletion}%` }}
                ></div>
              </div>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Complete the following information for your IDO project.
          </p>
        </div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          
          <div className="mt-6">
            {activeTab === 'public-round' && 
              <PublicRoundForm 
                projectId={id as string} 
                onCompletionUpdate={handleCompletionUpdate} 
              />
            }
            {activeTab === 'token-info' && 
              <TokenInfoForm 
                projectId={id as string} 
                onCompletionUpdate={handleCompletionUpdate} 
              />
            }
            {activeTab === 'platform-setup' && 
              <PlatformSetupForm 
                projectId={id as string} 
                onCompletionUpdate={handleCompletionUpdate} 
              />
            }
            {activeTab === 'faq' && 
              <FAQForm 
                projectId={id as string} 
                onCompletionUpdate={handleCompletionUpdate} 
              />
            }
            {activeTab === 'l2e-quiz' && 
              <L2EQuizForm 
                projectId={id as string} 
                onCompletionUpdate={handleCompletionUpdate} 
              />
            }
            {activeTab === 'marketing-kit' && 
              <MarketingKitForm 
                projectId={id as string} 
                onCompletionUpdate={handleCompletionUpdate} 
              />
            }
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProjectPage;
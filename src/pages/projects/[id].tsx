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

const tabs = [
  { id: 'public-round', label: 'Public Round' },
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
        const { data: projectData, error: projectError } = await getProjectById(id as string);
        
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
          <h1 className="text-2xl font-semibold text-gray-900">{project?.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete the following information for your IDO project.
          </p>
        </div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          
          <div className="mt-6">
            {activeTab === 'public-round' && <PublicRoundForm />}
            {activeTab === 'token-info' && <TokenInfoForm />}
            {activeTab === 'platform-setup' && <PlatformSetupForm />}
            {activeTab === 'faq' && <FAQForm />}
            {activeTab === 'l2e-quiz' && <L2EQuizForm />}
            {activeTab === 'marketing-kit' && <MarketingKitForm />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProjectPage;
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import CreateProjectForm from '@/components/admin/CreateProjectForm';

const ProjectsPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new project page
    router.push('/admin/projects/new');
  }, [router]);

  return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </Layout>
  );
};

export default ProjectsPage;
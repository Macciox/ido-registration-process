import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import CreateProjectForm from '@/components/admin/CreateProjectForm';
import ProjectsList from '@/components/admin/ProjectsList';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { User } from '@/types/database.types';

const AdminDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser || !(await isAdmin(currentUser))) {
          // Not authenticated or not an admin, redirect to login
          router.push('/login');
          return;
        }
        
        setUser(currentUser);
      } catch (err) {
        console.error('Authentication error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  if (loading) {
    return (
      <Layout>
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage projects and project owners
          </p>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid grid-cols-1 gap-6">
            <CreateProjectForm />
            
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-6">All Projects</h2>
              <ProjectsList />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
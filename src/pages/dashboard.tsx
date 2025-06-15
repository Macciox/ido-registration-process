import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getProjectByOwnerEmail } from '@/lib/projects';
import { User } from '@/types/database.types';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          // Not authenticated, redirect to login
          router.push('/login');
          return;
        }
        
        setUser(currentUser);
        
        // Check if admin and redirect to admin dashboard
        if (await isAdmin(currentUser)) {
          router.push('/admin/dashboard');
          return;
        }
        
        // For project owners, check if they have a project
        const { data: project } = await getProjectByOwnerEmail(currentUser.email);
        
        if (project) {
          // Redirect to their project page
          router.push(`/projects/${project.id}`);
        } else {
          // No project assigned yet
          // Stay on this page and show a message
        }
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
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Welcome, {user?.email}</h1>
            
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p>You don't have any projects assigned yet. Please contact the Decubate team for assistance.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
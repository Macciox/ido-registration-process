import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser } from '@/lib/auth';

// This is now a redirect component
const Dashboard: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        // Redirect based on user role
        if (currentUser.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (currentUser.role === 'project_owner') {
          router.push('/project-owner/dashboard');
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      }
    };
    
    redirectUser();
  }, [router]);

  // Return empty div while redirecting
  return <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>;
};

export default Dashboard;
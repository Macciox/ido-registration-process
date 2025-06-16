import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import AdminInvite from '@/components/admin/AdminInvite';
import PasswordReset from '@/components/auth/PasswordReset';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types/database.types';

const AdminSettingsPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        if (currentUser.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        
        setUser(currentUser);
      } catch (err) {
        console.error('Auth check error:', err);
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
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Settings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminInvite />
          <PasswordReset />
        </div>
      </div>
    </Layout>
  );
};

export default AdminSettingsPage;
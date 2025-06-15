import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        
        if (user) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard');
        } else {
          // User is not logged in, redirect to login
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);

  return (
    <Layout>
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Decubate IDO Registration Platform</h1>
          <p className="text-xl text-gray-600 mb-8">
            A secure platform for managing Web3 project launches
          </p>
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    </Layout>
  );
}
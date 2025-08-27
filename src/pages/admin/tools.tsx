import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';

const AdminTools: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    };
    init();
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Tools</h1>
          <p className="text-text-secondary">Administrative tools and utilities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Whitelist Checker */}
          <div className="sleek-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white">Whitelist Checker</h3>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              Verify and validate project owner whitelist status
            </p>
            <button className="btn-dark w-full" disabled>
              Coming Soon
            </button>
          </div>

          {/* MiCA Compliance Checker */}
          <div className="sleek-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2L3 7v11c0 5.55 3.84 7.74 9 9 5.16-1.26 9-3.45 9-9V7l-7-5zM8 11l-2-2 1.41-1.41L8 8.17l4.59-4.58L14 5l-6 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white">MiCA Compliance Checker</h3>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              AI-powered MiCA compliance analysis for whitepapers and legal documents
            </p>
            <a href="/admin/compliance" className="btn-primary w-full block text-center">
              Launch Checker
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminTools;
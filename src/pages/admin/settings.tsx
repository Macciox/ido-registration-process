import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

// This is now a redirect component
const AdminSettingsPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the admin dashboard with settings tab active
    router.push('/admin/dashboard?tab=settings');
  }, [router]);

  // Return empty div while redirecting
  return <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>;
};

export default AdminSettingsPage;
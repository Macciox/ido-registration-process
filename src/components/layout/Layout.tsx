import React, { ReactNode, useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types/database.types';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {!loading && user ? (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-64 flex-shrink-0">
              <Sidebar user={user} />
            </div>
            <div className="flex-1">
              {children}
            </div>
          </div>
        ) : (
          <div>
            {children}
          </div>
        )}
      </div>
      
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Decubate. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
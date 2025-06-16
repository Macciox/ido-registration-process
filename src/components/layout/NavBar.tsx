import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { User } from '@/types/database.types';

interface NavBarProps {
  user: User | null;
  loading: boolean;
  onLogout: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ user, loading, onLogout }) => {
  const router = useRouter();
  
  if (loading) return null;
  
  return (
    <div className="bg-gray-100 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between py-3">
          <div className="flex space-x-4">
            {user && (
              <>
                {user.role === 'admin' && (
                  <Link href="/admin/projects" className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.pathname.startsWith('/admin/projects') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}>
                    Projects List
                  </Link>
                )}
                <Link href="/admin/dashboard" className={`px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === '/admin/dashboard' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-200'
                }`}>
                  Dashboard
                </Link>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  <span className="font-medium">{user.email}</span> ({user.role})
                </span>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark transition-colors">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
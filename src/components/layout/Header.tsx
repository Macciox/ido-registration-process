import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types/database.types';
import LogoutButton from './LogoutButton';

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef]);

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin/dashboard" className="text-xl font-bold text-primary">
                Decubate IDO
              </Link>
            </div>
            {!loading && user && (
              <div className="ml-6 flex items-center">
                <div className="text-sm font-medium text-gray-500">
                  Logged in as: <span className="text-primary font-bold">{user.role}</span>
                </div>
              </div>
            )}
          </div>
          
          {!loading && user && (
            <div className="flex items-center">
              <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
                <Link href="/admin/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Dashboard
                </Link>
                
                {/* User dropdown menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <span>Account</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                      {user.role === 'admin' && (
                        <Link href="/admin/dashboard?tab=settings" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Admin Settings
                        </Link>
                      )}
                      <div className="px-4 py-2 text-sm text-gray-700">
                        <LogoutButton />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                >
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <svg
                    className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {!loading && !user && (
            <div className="flex items-center">
              <Link href="/login" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                Login
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link href="/admin/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
            Dashboard
          </Link>
          {user?.role === 'admin' && (
            <Link href="/admin/dashboard?tab=settings" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
              Admin Settings
            </Link>
          )}
          <div className="px-3 py-2">
            <LogoutButton mobile={true} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
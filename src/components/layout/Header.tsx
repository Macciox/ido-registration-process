import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getCurrentUser, signOut } from '@/lib/auth';
import { User } from '@/types/database.types';

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
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
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const navigateTo = (path: string) => {
    // Close menu first
    setIsProfileMenuOpen(false);
    // Use setTimeout to ensure menu is closed before navigation
    setTimeout(() => {
      router.push(path);
    }, 10);
  };

  return (
    <header className="border-b border-white/10 backdrop-blur-lg bg-bg-secondary/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a 
              href="/admin/dashboard"
              className="flex items-center gap-3 group"
            >
              <img 
                src="/assets/decubate-logo.svg" 
                alt="Decubate Technologies" 
                className="h-8 w-auto transition-all duration-300 group-hover:scale-105"
              />
            </a>
          </div>
          
          {!loading && user && (
            <div className="flex items-center">
              {/* Profile dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 focus:outline-none transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-white">{user.email.split('@')[0]}</p>
                    <p className="text-xs text-text-secondary capitalize">{user.role}</p>
                  </div>
                  <svg className="w-4 h-4 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 sleek-card p-2 header-dropdown">
                    <div className="px-3 py-2 border-b border-white/10 mb-2">
                      <p className="text-sm font-medium text-white">{user.email}</p>
                      <p className="text-xs text-text-secondary capitalize">{user.role} Account</p>
                    </div>
                    
                    <a
                      href="#"
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Account Settings
                    </a>
                    
                    <a
                      href="#"
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1H5a1 1 0 01-1-1zm5 0v-1a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      Change Password
                    </a>
                    
                    <a
                      href="#"
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 012 2v6.5a.5.5 0 001 0V7a1 1 0 112 0v4.5a2.5 2.5 0 01-5 0V5z" clipRule="evenodd" />
                      </svg>
                      Delete Account
                    </a>
                    
                    <div className="border-t border-white/10 my-2"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!loading && !user && (
            <div className="flex items-center">
              <a href="/login" className="nav-item">
                Login
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
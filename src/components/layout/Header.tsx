import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getCurrentUser, signOut } from '@/lib/auth';
import { User } from '@/types/database.types';
import Portal from '@/components/ui/Portal';

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
      setIsProfileMenuOpen(false);
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const navigateTo = (path: string) => {
    setIsProfileMenuOpen(false);
    router.push(path);
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
                  <Portal>
                    <div 
                      className="fixed sleek-card p-2 header-dropdown" 
                      style={{
                        zIndex: 2147483647,
                        position: 'fixed',
                        width: '14rem',
                        top: profileMenuRef.current ? profileMenuRef.current.getBoundingClientRect().bottom + 8 : 0,
                        left: profileMenuRef.current ? profileMenuRef.current.getBoundingClientRect().right - 224 : 0,
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <div className="px-3 py-2 border-b border-white/10 mb-2">
                        <p className="text-sm font-medium text-white">{user.email}</p>
                        <p className="text-xs text-text-secondary capitalize">{user.role} Account</p>
                      </div>
                      
                      <button
                        onClick={() => navigateTo(`/${user.role === 'admin' ? 'admin' : 'project-owner'}/settings`)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        Settings
                      </button>
                      
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
                  </Portal>
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
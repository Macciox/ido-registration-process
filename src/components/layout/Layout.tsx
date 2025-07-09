import React, { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  projectId?: string;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen animated-bg">
      <Header />
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      
      <footer className="border-t border-white/10 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-text-secondary text-sm">
              &copy; {new Date().getFullYear()} Decubate IDO Platform. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">Terms</a>
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
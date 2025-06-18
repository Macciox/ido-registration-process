import React, { ReactNode } from 'react';
import Header from './Header';
import { BrandingProvider } from '@/lib/BrandingProvider';
import { useBranding } from '@/lib/BrandingProvider';

interface LayoutProps {
  children: ReactNode;
  projectId?: string;
}

// Component to apply branding styles
const BrandedLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { mediaKit, loading } = useBranding();
  
  // Apply branding styles if available
  const brandingStyles = !loading && mediaKit ? {
    '--primary-color': mediaKit.primary_color,
    '--secondary-color': mediaKit.secondary_color,
    '--font-family': mediaKit.font_family || 'inherit',
    backgroundColor: mediaKit.secondary_color ? `${mediaKit.secondary_color}10` : undefined // Very light version of secondary color
  } as React.CSSProperties : {};
  
  return (
    <div className="min-h-screen" style={brandingStyles}>
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      
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

const Layout: React.FC<LayoutProps> = ({ children, projectId }) => {
  return (
    <BrandingProvider projectId={projectId}>
      <BrandedLayout>
        {children}
      </BrandedLayout>
    </BrandingProvider>
  );
};

export default Layout;
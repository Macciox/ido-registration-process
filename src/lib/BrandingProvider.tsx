import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMediaKit, MediaKit } from '@/lib/mediaKit';

// Simplified context with minimal properties
interface BrandingContextType {
  mediaKit: MediaKit | null;
}

const BrandingContext = createContext<BrandingContextType>({
  mediaKit: null
});

export const useBranding = () => useContext(BrandingContext);

interface BrandingProviderProps {
  children: ReactNode;
  projectId?: string;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children, projectId }) => {
  const [mediaKit, setMediaKit] = useState<MediaKit | null>(null);

  useEffect(() => {
    // Only try to load media kit if projectId is provided
    if (projectId) {
      getMediaKit(projectId)
        .then(kit => {
          if (kit) setMediaKit(kit);
        })
        .catch(err => {
          console.error('Error loading media kit:', err);
        });
    }
  }, [projectId]);

  return (
    <BrandingContext.Provider value={{ mediaKit }}>
      {children}
    </BrandingContext.Provider>
  );
};

export default BrandingProvider;
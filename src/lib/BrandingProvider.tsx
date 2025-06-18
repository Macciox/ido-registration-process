import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMediaKit, MediaKit } from '@/lib/mediaKit';

interface BrandingContextType {
  mediaKit: MediaKit | null;
  loading: boolean;
  error: string | null;
}

const BrandingContext = createContext<BrandingContextType>({
  mediaKit: null,
  loading: true,
  error: null
});

export const useBranding = () => useContext(BrandingContext);

interface BrandingProviderProps {
  children: ReactNode;
  projectId?: string;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children, projectId }) => {
  const [mediaKit, setMediaKit] = useState<MediaKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMediaKit = async () => {
      try {
        setLoading(true);
        const kit = await getMediaKit(projectId);
        setMediaKit(kit);
      } catch (err: any) {
        console.error('Error loading media kit:', err);
        setError(err.message || 'Failed to load branding');
      } finally {
        setLoading(false);
      }
    };

    loadMediaKit();
  }, [projectId]);

  return (
    <BrandingContext.Provider value={{ mediaKit, loading, error }}>
      {children}
    </BrandingContext.Provider>
  );
};

export default BrandingProvider;
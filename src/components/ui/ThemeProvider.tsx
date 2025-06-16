import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMediaKit, MediaKit } from '@/lib/mediaKit';

interface ThemeContextType {
  mediaKit: MediaKit | null;
  loading: boolean;
  setProjectId: (id: string | null) => void;
}

const defaultThemeContext: ThemeContextType = {
  mediaKit: null,
  loading: true,
  setProjectId: () => {}
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mediaKit, setMediaKit] = useState<MediaKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const loadMediaKit = async () => {
      setLoading(true);
      const kit = await getMediaKit(projectId || undefined);
      setMediaKit(kit);
      setLoading(false);
      
      // Apply theme to document
      if (kit) {
        document.documentElement.style.setProperty('--color-primary', kit.primary_color);
        document.documentElement.style.setProperty('--color-secondary', kit.secondary_color);
        document.documentElement.style.setProperty('--font-family', kit.font_family);
      }
    };
    
    loadMediaKit();
  }, [projectId]);

  return (
    <ThemeContext.Provider value={{ mediaKit, loading, setProjectId }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
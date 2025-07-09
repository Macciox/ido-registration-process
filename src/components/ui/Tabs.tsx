import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

interface Tab {
  id: string;
  label: string;
  completion?: number;
}

interface TabsProps {
  tabs: Tab[];
  renderContent: (activeTab: string) => React.ReactNode;
  defaultTab?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, renderContent, defaultTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');
  const [renderedTabs, setRenderedTabs] = useState<string[]>([]);

  // Quando il componente viene montato, renderizza il contenuto della tab attiva
  useEffect(() => {
    if (activeTab && !renderedTabs.includes(activeTab)) {
      setRenderedTabs(prev => [...prev, activeTab]);
    }
  }, [activeTab]);

  return (
    <div>
      <div className="border-b border-white/10 mb-6">
        <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                tab.id === activeTab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-white/20'
              )}
              aria-current={tab.id === activeTab ? 'page' : undefined}
            >
              <div className="flex items-center">
                {tab.label}
                {tab.completion !== undefined && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    tab.completion > 0 
                      ? 'bg-secondary/20 text-secondary border border-secondary/30' 
                      : 'bg-white/10 text-text-muted border border-white/20'
                  }`}>
                    {tab.completion}%
                  </span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>
      
      <div className="py-4">
        {/* Renderizza il contenuto della tab attiva */}
        <div className="text-text-primary">
          {renderContent(activeTab)}
        </div>
        
        {/* Pre-renderizza il contenuto di tutte le altre tab in modo nascosto */}
        <div className="hidden">
          {tabs.map(tab => 
            tab.id !== activeTab && !renderedTabs.includes(tab.id) && (
              <div key={tab.id}>
                {renderContent(tab.id)}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Tabs;
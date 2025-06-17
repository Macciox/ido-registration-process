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
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
                tab.id === activeTab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              aria-current={tab.id === activeTab ? 'page' : undefined}
            >
              <div className="flex items-center">
                {tab.label}
                {tab.completion !== undefined && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    tab.completion > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-700'
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
        {renderContent(activeTab)}
        
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
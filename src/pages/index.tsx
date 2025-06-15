import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import Tabs from '@/components/ui/Tabs';
import PublicRoundForm from '@/components/forms/PublicRoundForm';
import TokenInfoForm from '@/components/forms/TokenInfoForm';
import PlatformSetupForm from '@/components/forms/PlatformSetupForm';
import FAQForm from '@/components/forms/FAQForm';
import L2EQuizForm from '@/components/forms/L2EQuizForm';
import MarketingKitForm from '@/components/forms/MarketingKitForm';

const tabs = [
  { id: 'public-round', label: 'Public Round' },
  { id: 'token-info', label: 'Token Info' },
  { id: 'platform-setup', label: 'Platform Setup' },
  { id: 'faq', label: 'FAQ' },
  { id: 'l2e-quiz', label: 'L2E Quiz' },
  { id: 'marketing-kit', label: 'Marketing Kit' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('public-round');

  return (
    <Layout>
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Project Registration</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete the following information for your IDO project.
          </p>
        </div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          
          <div className="mt-6">
            {activeTab === 'public-round' && <PublicRoundForm />}
            {activeTab === 'token-info' && <TokenInfoForm />}
            {activeTab === 'platform-setup' && <PlatformSetupForm />}
            {activeTab === 'faq' && <FAQForm />}
            {activeTab === 'l2e-quiz' && <L2EQuizForm />}
            {activeTab === 'marketing-kit' && <MarketingKitForm />}
          </div>
        </div>
      </div>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { COMPLIANCE_PROMPTS } from '@/lib/compliance/prompts';

export default function PromptsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState(COMPLIANCE_PROMPTS);
  const [activeTab, setActiveTab] = useState('WHITEPAPER_ANALYSIS');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    };
    init();
  }, [router]);

  const handlePromptChange = (key: string, value: string) => {
    setPrompts(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const savePrompts = async () => {
    try {
      const response = await fetch('/api/compliance/update-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts),
      });

      if (response.ok) {
        setHasChanges(false);
        alert('Prompt salvati con successo!');
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (error) {
      alert('Errore nel salvataggio dei prompt');
    }
  };

  const resetPrompts = () => {
    setPrompts(COMPLIANCE_PROMPTS);
    setHasChanges(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Accesso Negato</h1>
          <p className="text-gray-600 mt-2">Accesso admin richiesto</p>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { key: 'WHITEPAPER_ANALYSIS', label: 'Analisi Whitepaper' },
    { key: 'LEGAL_ANALYSIS', label: 'Analisi Legale' },
    { key: 'SYSTEM_PROMPT', label: 'Prompt Sistema' }
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Editor Prompt GPT-4</h1>
          <div className="space-x-4">
            {hasChanges && (
              <span className="text-orange-600 font-medium">Modifiche non salvate</span>
            )}
            <button
              onClick={resetPrompts}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Reset
            </button>
            <button
              onClick={savePrompts}
              disabled={!hasChanges}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Salva Prompt
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">
                {tabs.find(t => t.key === activeTab)?.label}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {activeTab === 'WHITEPAPER_ANALYSIS' && 'Prompt per l\'analisi dei whitepaper MiCA. Usa le variabili: {category}, {item_name}, {description}, {relevant_content}'}
                {activeTab === 'LEGAL_ANALYSIS' && 'Prompt per l\'analisi dei documenti legali. Usa le variabili: {category}, {item_name}, {description}, {relevant_content}'}
                {activeTab === 'SYSTEM_PROMPT' && 'Prompt di sistema per definire il comportamento generale dell\'AI'}
              </p>
            </div>

            <textarea
              value={prompts[activeTab as keyof typeof prompts]}
              onChange={(e) => handlePromptChange(activeTab, e.target.value)}
              className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
              placeholder="Inserisci il prompt..."
            />

            <div className="mt-4 text-sm text-gray-500">
              <p><strong>Variabili disponibili:</strong></p>
              <ul className="list-disc list-inside mt-2">
                <li><code>{'{category}'}</code> - Categoria dell'item da verificare</li>
                <li><code>{'{item_name}'}</code> - Nome dell'item da verificare</li>
                <li><code>{'{description}'}</code> - Descrizione dell'item</li>
                <li><code>{'{relevant_content}'}</code> - Contenuto rilevante del documento</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Importante</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• I prompt devono restituire JSON valido con i campi: status, coverage_score, reasoning, evidence_snippets</li>
            <li>• Status deve essere: FOUND, NEEDS_CLARIFICATION, o MISSING</li>
            <li>• Coverage_score deve essere un numero da 0 a 100</li>
            <li>• Le modifiche si applicano immediatamente alle nuove analisi</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
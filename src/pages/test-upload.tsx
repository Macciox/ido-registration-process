import { useState } from 'react';

export default function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/compliance/test-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(`✅ SUCCESS: ${data.message}\nPath: ${data.path}`);
      } else {
        setResult(`❌ ERROR: ${data.error}`);
      }
    } catch (error: any) {
      setResult(`❌ NETWORK ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Test Upload</h1>
      
      <form onSubmit={handleUpload}>
        <div style={{ marginBottom: '20px' }}>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={!file || loading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? 'Uploading...' : 'Upload PDF'}
        </button>
      </form>

      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: result.includes('SUCCESS') ? '#d4edda' : '#f8d7da',
          border: '1px solid ' + (result.includes('SUCCESS') ? '#c3e6cb' : '#f5c6cb'),
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </div>
      )}
    </div>
  );
}
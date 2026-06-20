import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function Documents({ user }) {
  const [docs, setDocs] = useState([]);
  const [name, setName] = useState('');

  const loadDocs = () => {
    fetch(`${API}/documents`)
      .then(r => r.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const uploadDoc = async () => {
    if (!name) return;
    await fetch(`${API}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.id, name })
    });
    setName('');
    loadDocs();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight">Documents</h1>
      </div>

      <div className="bg-white border rounded-3xl p-6 mb-6">
        <div className="flex gap-3">
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Document name (e.g. Contract-Feb2025.pdf)" 
            className="flex-1 border p-3 rounded-2xl" 
          />
          <button onClick={uploadDoc} className="px-8 bg-[#083a9b] text-white rounded-2xl font-medium">Upload</button>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-2">
        {docs.length === 0 && <div className="p-6 text-gray-500">No documents yet.</div>}
        {docs.map(doc => (
          <div key={doc.id} className="p-4 border-b last:border-b-0 flex justify-between items-center">
            <div>
              <div className="font-medium">{doc.name}</div>
              <div className="text-xs text-gray-500">{doc.date}</div>
            </div>
            <button className="text-sm text-red-500">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
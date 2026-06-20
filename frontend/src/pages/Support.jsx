import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function Support({ user }) {
  const [issues, setIssues] = useState([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const loadIssues = () => {
    fetch(`${API}/issues?userId=${user?.id || 3}`)
      .then(r => r.json())
      .then(setIssues)
      .catch(() => setIssues([]));
  };

  useEffect(() => {
    loadIssues();
  }, [user]);

  const submitIssue = async () => {
    if (!subject || !description) return;

    await fetch(`${API}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user?.id || 3,
        subject,
        description
      })
    });

    setSubject('');
    setDescription('');
    loadIssues();
    alert('Issue submitted successfully!');
  };

  const resolveIssue = async (id) => {
    await fetch(`${API}/issues/${id}/resolve`, { method: 'PATCH' });
    loadIssues();
  };

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight mb-6">Support &amp; Issues</h1>

      <div className="bg-white border rounded-3xl p-6 mb-8">
        <h3 className="font-semibold mb-4">Submit New Issue</h3>
        <div className="space-y-4">
          <input 
            value={subject} 
            onChange={e => setSubject(e.target.value)} 
            placeholder="Subject" 
            className="w-full border p-3 rounded-2xl" 
          />
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="Describe the issue..." 
            className="w-full border p-3 rounded-2xl h-28" 
          />
          <button onClick={submitIssue} className="px-8 py-2.5 bg-[#083a9b] text-white rounded-2xl font-medium">
            Submit Issue
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-2">
        <div className="p-4 font-semibold">Your Issues</div>
        {issues.length === 0 && <div className="p-4 text-gray-500">No issues yet.</div>}
        {issues.map(issue => (
          <div key={issue.id} className="p-4 border-t">
            <div className="flex justify-between">
              <div className="font-medium">{issue.subject}</div>
              <span className={`text-xs px-3 py-1 rounded-3xl ${issue.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {issue.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
            {issue.status !== 'resolved' && (
              <button onClick={() => resolveIssue(issue.id)} className="mt-2 text-xs text-emerald-600">Mark as Resolved</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch(`${API}/tasks`)
      .then(r => r.json())
      .then(setTasks)
      .catch(() => setTasks([]));
  }, []);

  const updateStatus = async (id, status) => {
    await fetch(`${API}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
  };

  const columns = {
    todo: tasks.filter(t => t.status === 'todo'),
    inprogress: tasks.filter(t => t.status === 'inprogress'),
    done: tasks.filter(t => t.status === 'done')
  };

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight mb-6">Tasks</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Object.entries(columns).map(([status, list]) => (
          <div key={status} className="bg-white border rounded-3xl p-4 min-h-[400px]">
            <div className="font-semibold mb-4 capitalize flex justify-between">
              {status.replace('inprogress', 'In Progress')}
              <span className="text-gray-400 font-normal">({list.length})</span>
            </div>
            <div className="space-y-3">
              {list.map(task => (
                <div key={task.id} className="bg-gray-50 p-4 rounded-2xl text-sm">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{task.assignee} • Due {task.due}</div>
                  <select 
                    value={task.status} 
                    onChange={(e) => updateStatus(task.id, e.target.value)}
                    className="mt-3 text-xs border rounded-2xl p-1 w-full"
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
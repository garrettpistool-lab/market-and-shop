import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function Invoices({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadInvoices = () => {
    const url = user?.role?.toLowerCase() === 'vendor' && user.vendor 
      ? `${API}/invoices?vendorId=${user.vendor}` 
      : `${API}/invoices`;
    fetch(url)
      .then(r => r.json())
      .then(setInvoices)
      .catch(() => {
        // Fallback placeholder data (for when no real invoices yet)
        setInvoices([
          { id: 1, vendor_id: 1, amount: 1240, status: "paid", date: "2025-01-28", due_date: "2025-02-12", file: "INV-884.pdf" },
          { id: 2, vendor_id: 2, amount: 890, status: "pending", date: "2025-02-01", due_date: "2025-02-18", file: "INV-885.pdf" },
        ]);
      });
  };

  useEffect(() => { loadInvoices(); }, [user]);

  const openDetails = (inv) => {
    setSelected(inv);
    setShowModal(true);
  };

  const updateStatus = async (id, status) => {
    await fetch(`${API}/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadInvoices();
    if (selected && selected.id === id) {
      setSelected({ ...selected, status });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight">Invoices</h1>
        {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'vendor') && (
          <button className="px-6 py-2.5 bg-[#083a9b] text-white rounded-3xl text-sm font-medium">+ New Invoice</button>
        )}
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">Invoice</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openDetails(inv)}>
                <td className="p-4 font-medium">{inv.file || `INV-${inv.id}`}</td>
                <td className="p-4 font-semibold">${inv.amount}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-3xl text-xs ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="p-4 text-gray-500">{inv.due_date}</td>
                <td className="p-4 text-[#083a9b] text-sm">View</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold mb-4">Invoice Details</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Invoice:</strong> {selected.file || `INV-${selected.id}`}</div>
              <div><strong>Amount:</strong> ${selected.amount}</div>
              <div><strong>Status:</strong> {selected.status}</div>
              <div><strong>Issued:</strong> {selected.date}</div>
              <div><strong>Due:</strong> {selected.due_date}</div>
            </div>

            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'vendor') && selected.status !== 'paid' && (
              <div className="mt-6 flex gap-3">
                <button onClick={() => updateStatus(selected.id, 'paid')} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-2xl">Mark as Paid</button>
                <button onClick={() => updateStatus(selected.id, 'overdue')} className="flex-1 py-2.5 border rounded-2xl">Mark Overdue</button>
              </div>
            )}

            <button onClick={() => setShowModal(false)} className="mt-6 w-full py-2.5 border rounded-2xl">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import {
  addVendorEmployee,
  availablePermissionsForVendorPlan,
  employeeLimitForPlan,
  fetchVendorEmployees,
  removeVendorEmployee,
  updateEmployeePermissions,
} from '../lib/employeesApi';
import { planBadgeLabel } from '../lib/plans';

export default function EmployeeManagement({ user, vendorId, plan }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedPerms, setSelectedPerms] = useState(['sell']);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const permOptions = availablePermissionsForVendorPlan(plan);
  const limit = employeeLimitForPlan(plan);
  const activeCount = employees.filter((e) => e.active !== false).length;

  const refresh = async () => {
    if (!vendorId) return;
    setLoading(true);
    const rows = await fetchVendorEmployees(vendorId);
    setEmployees(rows.filter((e) => e.active !== false));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [vendorId]);

  const togglePerm = (key) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleAdd = async () => {
    if (!email.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      await addVendorEmployee({
        vendorId,
        email,
        permissions: selectedPerms,
        plan,
      });
      setEmail('');
      setSelectedPerms(['sell']);
      setMessage('Employee linked. They can sign in with that email to access granted permissions.');
      await refresh();
    } catch (e) {
      setMessage(e.message);
    }
    setSaving(false);
  };

  const handleUpdatePerms = async (emp) => {
    try {
      await updateEmployeePermissions(emp.id, emp._editPerms || emp.permissions, plan);
      setMessage(`Updated permissions for ${emp.employee_email}`);
      await refresh();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleRemove = async (emp) => {
    if (!confirm(`Remove access for ${emp.employee_email}?`)) return;
    try {
      await removeVendorEmployee(emp.id);
      await refresh();
      setMessage('Employee access removed.');
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <div className="bg-white border rounded-3xl p-8">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h3 className="font-bold text-xl">Employee Access</h3>
          <p className="text-sm text-gray-600 mt-1">
            Connect staff logins with granular permissions.{' '}
            <span className="font-medium">{planBadgeLabel(plan, 'vendor')}</span> — {activeCount}/{limit === 50 ? '∞' : limit} seat{limit !== 1 ? 's' : ''} used.
          </p>
        </div>
        {plan === 'free' && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-2xl">
            Free plan: 1 employee max. Upgrade to Paid for full staff access.
          </div>
        )}
      </div>

      <div className="border rounded-2xl p-4 mb-6 bg-gray-50">
        <div className="text-sm font-medium mb-2">Invite employee by email</div>
        <input
          type="email"
          placeholder="employee@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded-2xl mb-3 bg-white"
        />
        <div className="text-xs font-medium text-gray-500 mb-2">Permissions</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {permOptions.map((p) => (
            <label key={p.key} className="flex items-center gap-2 text-sm bg-white border rounded-xl px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPerms.includes(p.key)}
                onChange={() => togglePerm(p.key)}
              />
              {p.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || activeCount >= limit}
          className="px-6 py-2 bg-[#083a9b] text-white rounded-2xl text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Linking…' : 'Link Employee Account'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading employees…</p>
      ) : employees.length === 0 ? (
        <p className="text-sm text-gray-500">No employees linked yet.</p>
      ) : (
        <div className="space-y-4">
          {employees.map((emp) => (
            <div key={emp.id} className="border rounded-2xl p-4">
              <div className="flex justify-between items-start gap-2 mb-3">
                <div>
                  <div className="font-medium">{emp.employee_email}</div>
                  <div className="text-xs text-gray-500">Added {new Date(emp.created_at).toLocaleDateString()}</div>
                </div>
                <button type="button" onClick={() => handleRemove(emp)} className="text-xs text-red-600 hover:underline">
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {permOptions.map((p) => {
                  const current = emp._editPerms || emp.permissions || [];
                  return (
                    <label key={p.key} className="flex items-center gap-2 text-xs border rounded-lg px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={current.includes(p.key)}
                        onChange={() => {
                          const next = current.includes(p.key)
                            ? current.filter((x) => x !== p.key)
                            : [...current, p.key];
                          setEmployees((list) =>
                            list.map((e) => (e.id === emp.id ? { ...e, _editPerms: next } : e))
                          );
                        }}
                      />
                      {p.label}
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => handleUpdatePerms(emp)}
                className="mt-3 text-xs px-4 py-1.5 border rounded-xl hover:bg-gray-50"
              >
                Save permissions
              </button>
            </div>
          ))}
        </div>
      )}

      {message && <p className="mt-4 text-sm text-[#083a9b]">{message}</p>}
    </div>
  );
}
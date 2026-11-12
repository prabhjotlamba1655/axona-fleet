import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  Truck,
  Mail,
  Phone,
  UserCheck,
  X
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { User, Vehicle } from '../types';
import { useAuth } from '../context/AuthContext';

export const UserManagementView: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // New user form
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role_id: 'role_subuser',
    security_pin: '1234',
    vehicle_ids: [] as string[]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const uData = await apiFetch<any[]>('/users');
      setUsers(uData);

      const rData = await apiFetch<any[]>('/users/roles');
      setRoles(rData);

      const vData = await apiFetch<Vehicle[]>('/vehicles');
      setVehicles(vData);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setIsAddModalOpen(false);
      fetchData();
      alert('User created successfully!');
    } catch (err: any) {
      alert(`User creation failed: ${err.message}`);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await apiFetch(`/users/${id}/toggle-active`, { method: 'POST' });
      fetchData();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const toggleVehicleAssignment = (vId: string) => {
    setNewUser(prev => {
      const exists = prev.vehicle_ids.includes(vId);
      return {
        ...prev,
        vehicle_ids: exists ? prev.vehicle_ids.filter(id => id !== vId) : [...prev.vehicle_ids, vId]
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Roles & Access Control</h1>
          </div>
          <p className="text-xs text-slate-500">
            Configure multi-tenant role-based permissions (Super Admin, Company Admin, Owner, Sub User) and fleet vehicle assignment
          </p>
        </div>

        <button
          onClick={() => {
            setNewUser({
              name: '',
              email: '',
              phone: '',
              role_id: roles[roles.length - 1]?.id || 'role_subuser',
              security_pin: '1234',
              vehicle_ids: vehicles.length > 0 ? [vehicles[0].id] : []
            });
            setIsAddModalOpen(true);
          }}
          className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-xs flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Tenant User Accounts</h2>
          <span className="text-xs text-slate-500">Active Accounts: <strong>{users.length}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Tenant Account</th>
                <th className="py-3 px-4">Vehicle Scope</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded text-[11px]">
                      {u.role_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{u.tenant_name}</td>
                  <td className="py-3 px-4">
                    {u.role === 'sub_user' ? (
                      <div>
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {u.assigned_vehicles?.length || 0} Assigned Vehicles
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                          {u.assigned_vehicles?.map((av: any) => av.registration_number).join(', ') || 'None'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-[11px]">All Tenant Vehicles</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{u.last_login || 'Recently'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      u.is_active === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {u.is_active === 1 ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleActive(u.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                    >
                      {u.is_active === 1 ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New User Account</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singh"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vikram@apexlogistics.in"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98111 22334"
                  value={newUser.phone}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">User Role *</label>
                <select
                  value={newUser.role_id}
                  onChange={e => setNewUser({ ...newUser, role_id: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.display_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Security PIN (for immobilisation)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newUser.security_pin}
                  onChange={e => setNewUser({ ...newUser, security_pin: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                />
              </div>

              {newUser.role_id === 'role_subuser' && (
                <div className="pt-2">
                  <label className="block text-slate-700 font-bold mb-1">Assign Permitted Vehicles</label>
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                    {vehicles.map(v => (
                      <label key={v.id} className="flex items-center space-x-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={newUser.vehicle_ids.includes(v.id)}
                          onChange={() => toggleVehicleAssignment(v.id)}
                          className="rounded text-sky-600 focus:ring-0"
                        />
                        <span className="font-bold">{v.registration_number}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;

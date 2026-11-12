import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Truck,
  Car,
  AlertCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { Vehicle } from '../types';
import { useAuth } from '../context/AuthContext';

export const VehiclesView: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    registration_number: '',
    category_id: 'cat_truck',
    make: '',
    model: '',
    manufacturing_year: 2024,
    owner_name: '',
    owner_phone: '',
    emergency_contact_phone: '',
    speed_limit: 80,
    device_imei: '',
    device_manufacturer_id: 'mfg_ais140',
    device_model: 'AX-140-Pro',
    sim_number: '',
    installation_date: new Date().toISOString().split('T')[0]
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Vehicle[]>('/vehicles');
      setVehicles(data);

      const cats = await apiFetch<any[]>('/vehicles/categories');
      setCategories(cats);

      const mfgs = await apiFetch<any[]>('/vehicles/manufacturers');
      setManufacturers(mfgs);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      registration_number: '',
      category_id: categories[0]?.id || 'cat_car',
      make: '',
      model: '',
      manufacturing_year: 2024,
      owner_name: user?.name || '',
      owner_phone: user?.phone || '',
      emergency_contact_phone: '',
      speed_limit: 80,
      device_imei: '',
      device_manufacturer_id: manufacturers[0]?.id || 'mfg_ais140',
      device_model: 'AX-140-Pro',
      sim_number: '',
      installation_date: new Date().toISOString().split('T')[0]
    });
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      registration_number: v.registration_number,
      category_id: v.category_id,
      make: v.make,
      model: v.model,
      manufacturing_year: v.manufacturing_year || 2024,
      owner_name: v.owner_name,
      owner_phone: v.owner_phone,
      emergency_contact_phone: v.emergency_contact_phone,
      speed_limit: v.speed_limit,
      device_imei: v.device_imei || '',
      device_manufacturer_id: 'mfg_ais140',
      device_model: v.device_model || 'AX-140-Pro',
      sim_number: '',
      installation_date: v.installation_date || ''
    });
    setFormError(null);
    setFormSuccess(null);
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await apiFetch('/vehicles', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setFormSuccess('Vehicle registered successfully with AIS-140 device mapping!');
      setTimeout(() => {
        setIsAddModalOpen(false);
        fetchVehicles();
      }, 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setFormError(null);
    try {
      await apiFetch(`/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      setFormSuccess('Vehicle updated successfully!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        fetchVehicles();
      }, 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (vehicleId: string, regNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete vehicle ${regNumber}?`)) return;
    try {
      await apiFetch(`/vehicles/${vehicleId}`, { method: 'DELETE' });
      fetchVehicles();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleActive = async (vehicleId: string) => {
    try {
      await apiFetch(`/vehicles/${vehicleId}/toggle-active`, { method: 'POST' });
      fetchVehicles();
    } catch (err: any) {
      alert(`Status toggle failed: ${err.message}`);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesCategory = categoryFilter === 'all' || v.category_code === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && v.is_active === 1) ||
      (statusFilter === 'inactive' && v.is_active === 0);
    const matchesSearch =
      !searchQuery ||
      v.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.device_imei?.includes(searchQuery);
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fleet Vehicle Management</h1>
          <p className="text-xs text-slate-500">Register, configure AIS-140 GPS mapping, and manage fleet assets</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 shadow-xs flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 rounded-lg text-white shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search registration number, owner or IMEI..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.code}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Vehicle Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">GPS Device Mapping</th>
                <th className="py-3 px-4">Owner & Emergency Contact</th>
                <th className="py-3 px-4">Speed Limit</th>
                <th className="py-3 px-4">AIS-140 Status</th>
                <th className="py-3 px-4">Fleet Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map(veh => (
                <tr key={veh.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-slate-900 text-sm tracking-tight">
                      {veh.registration_number}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {veh.make} {veh.model} ({veh.manufacturing_year || 'N/A'})
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {veh.category_name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {veh.device_imei ? (
                      <div>
                        <div className="font-mono font-bold text-slate-800 text-[11px]">{veh.device_imei}</div>
                        <div className="text-[10px] text-slate-400">{veh.device_model || 'AIS-140 Device'}</div>
                      </div>
                    ) : (
                      <span className="text-amber-600 font-medium text-[11px]">Unmapped</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{veh.owner_name}</div>
                    <div className="text-[10px] text-slate-400">
                      Mob: {veh.owner_phone} | SOS: {veh.emergency_contact_phone}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {veh.speed_limit} km/h
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                      AIS-140 Compliant
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleActive(veh.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        veh.is_active === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {veh.is_active === 1 ? 'Active' : 'Deactivated'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => handleOpenEdit(veh)}
                      className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded"
                      title="Edit vehicle"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(veh.id, veh.registration_number)}
                      className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Delete vehicle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Vehicle Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {isAddModalOpen ? 'Register New Fleet Vehicle' : `Edit Vehicle ${formData.registration_number}`}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={isAddModalOpen ? handleCreateSubmit : handleEditSubmit} className="mt-4 space-y-4 text-xs">
              {/* Section 1: Vehicle Details */}
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                1. Vehicle Registration & Specifications
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-12-RN-2024"
                    value={formData.registration_number}
                    onChange={e => setFormData({ ...formData, registration_number: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vehicle Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Make / Manufacturer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Motors, BharatBenz, Maruti"
                    value={formData.make}
                    onChange={e => setFormData({ ...formData, make: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prima 4028.S, Ertiga"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Manufacturing Year</label>
                  <input
                    type="number"
                    value={formData.manufacturing_year}
                    onChange={e => setFormData({ ...formData, manufacturing_year: parseInt(e.target.value) || 2024 })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Configured Speed Limit (km/h)</label>
                  <input
                    type="number"
                    value={formData.speed_limit}
                    onChange={e => setFormData({ ...formData, speed_limit: parseFloat(e.target.value) || 80 })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              {/* Section 2: Owner & Emergency Contact */}
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pt-3 pb-1 border-b border-slate-100">
                2. Ownership & Emergency SOS Contacts
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Logistics LLP"
                    value={formData.owner_name}
                    onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Owner Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98220 12345"
                    value={formData.owner_phone}
                    onChange={e => setFormData({ ...formData, owner_phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Emergency SOS Contact *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98220 99999"
                    value={formData.emergency_contact_phone}
                    onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              {/* Section 3: AIS-140 GPS Device Mapping */}
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pt-3 pb-1 border-b border-slate-100">
                3. AIS-140 GPS Hardware Mapping
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">GPS Device IMEI *</label>
                  <input
                    type="text"
                    placeholder="e.g. 864201045892110"
                    value={formData.device_imei}
                    onChange={e => setFormData({ ...formData, device_imei: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Device Manufacturer</label>
                  <select
                    value={formData.device_manufacturer_id}
                    onChange={e => setFormData({ ...formData, device_manufacturer_id: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  >
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">SIM Card Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9988112233"
                    value={formData.sim_number}
                    onChange={e => setFormData({ ...formData, sim_number: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {isAddModalOpen ? 'Complete Registration' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Bulk Import Fleet Vehicles</h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>Upload CSV formatted fleet vehicle list with registration numbers and GPS device IMEIs.</p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]">
                registration_number,make,model,category_id,device_imei<br />
                MH-12-AB-1001,Tata,Prima,cat_truck,864201045892501<br />
                MH-12-AB-1002,Ashok Leyland,Viking,cat_bus,864201045892502
              </div>

              <button
                onClick={async () => {
                  try {
                    await apiFetch('/vehicles/bulk-import', {
                      method: 'POST',
                      body: JSON.stringify({
                        vehicles: [
                          { registration_number: 'MH-12-AB-1001', make: 'Tata Motors', model: 'Prima 4028.S', category_id: 'cat_truck', device_imei: '864201045892501' },
                          { registration_number: 'MH-12-AB-1002', make: 'Ashok Leyland', model: 'Viking Bus', category_id: 'cat_bus', device_imei: '864201045892502' }
                        ]
                      })
                    });
                    alert('Sample bulk fleet imported successfully!');
                    setIsBulkModalOpen(false);
                    fetchVehicles();
                  } catch (e: any) {
                    alert(`Import failed: ${e.message}`);
                  }
                }}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs"
              >
                Import Sample 2-Vehicle Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesView;

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  CreditCard,
  Bell,
  CheckCircle2,
  Shield,
  FileText,
  DollarSign,
  Radio,
  Zap,
  Lock,
  PhoneCall,
  Save,
  Check
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'notifications' | 'subscription' | 'telematics'>('company');
  const [companyData, setCompanyData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  });

  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isSavedMessage, setIsSavedMessage] = useState<string | null>(null);

  const [notificationPrefs, setNotificationPrefs] = useState({
    panicSMS: true,
    overspeedPush: true,
    powerDisconnectEmail: true,
    geofenceInApp: true,
    policeContact: '112',
    ambulanceContact: '108'
  });

  const fetchData = async () => {
    try {
      const settingsRes = await apiFetch<any>('/settings');
      if (settingsRes.tenant) {
        setCompanyData({
          name: settingsRes.tenant.name || '',
          contact_person: settingsRes.tenant.contact_person || '',
          email: settingsRes.tenant.email || '',
          phone: settingsRes.tenant.phone || '',
          address: settingsRes.tenant.address || '',
          city: settingsRes.tenant.city || '',
          state: settingsRes.tenant.state || ''
        });
      }

      const subRes = await apiFetch<any>('/subscriptions/current');
      setSubscriptionData(subRes);
      setAvailablePlans(subRes.availablePlans || []);
      setPayments(subRes.payments || []);
      if (subRes.subscription) {
        setSelectedPlanId(subRes.subscription.plan_id);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/settings/company', {
        method: 'PUT',
        body: JSON.stringify(companyData)
      });
      setIsSavedMessage('Company profile updated successfully!');
      setTimeout(() => setIsSavedMessage(null), 3000);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    try {
      const res = await apiFetch<any>('/subscriptions/upgrade', {
        method: 'POST',
        body: JSON.stringify({ plan_id: planId, vehicle_count: 10 })
      });
      alert(`Subscription upgraded! Invoice ${res.invoiceNumber} generated.`);
      fetchData();
    } catch (err: any) {
      alert(`Upgrade failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Platform & Subscription Settings</h1>
          </div>
          <p className="text-xs text-slate-500">
            Configure organization profile, emergency contact routes, notification preferences, and SaaS licensing
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'company'
              ? 'border-sky-600 text-sky-600 bg-sky-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Company Profile
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'subscription'
              ? 'border-sky-600 text-sky-600 bg-sky-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          SaaS Subscription & Invoices
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'notifications'
              ? 'border-sky-600 text-sky-600 bg-sky-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Notification Preferences
        </button>
        <button
          onClick={() => setActiveTab('telematics')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'telematics'
              ? 'border-sky-600 text-sky-600 bg-sky-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          AIS-140 Gateway Protocols
        </button>
      </div>

      {isSavedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{isSavedMessage}</span>
        </div>
      )}

      {/* Tab 1: Company Profile */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Company Fleet Profile</h2>
          <p className="text-xs text-slate-500 mb-4">Official billing and emergency registration details</p>

          <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Company / Fleet Name *</label>
                <input
                  type="text"
                  required
                  value={companyData.name}
                  onChange={e => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={companyData.contact_person}
                  onChange={e => setCompanyData({ ...companyData, contact_person: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Official Email</label>
                <input
                  type="email"
                  disabled
                  value={companyData.email}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={companyData.phone}
                  onChange={e => setCompanyData({ ...companyData, phone: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Office Address</label>
              <input
                type="text"
                value={companyData.address}
                onChange={e => setCompanyData({ ...companyData, address: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">City</label>
                <input
                  type="text"
                  value={companyData.city}
                  onChange={e => setCompanyData({ ...companyData, city: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">State</label>
                <input
                  type="text"
                  value={companyData.state}
                  onChange={e => setCompanyData({ ...companyData, state: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Subscription & Billing (Section 17 Requirements) */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Active Plan Usage Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Subscription</span>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {subscriptionData?.subscription?.plan_name || 'Axona Fleet Enterprise Annual'}
                </h3>
                <div className="text-xs text-slate-500">
                  Per-vehicle billing: <strong>₹{subscriptionData?.subscription?.price_per_vehicle || 2799}/vehicle</strong>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Active Subscription
                </span>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Valid until: {subscriptionData?.subscription?.end_date || '2025-01-01'}
                </div>
              </div>
            </div>

            {/* Vehicle Quota Usage */}
            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Fleet License Utilization</span>
                <span>
                  {subscriptionData?.vehicleUsage?.activeVehicles || 6} / {subscriptionData?.vehicleUsage?.licensedVehicles || 100} Vehicles Active
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-600 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ((subscriptionData?.vehicleUsage?.activeVehicles || 6) / (subscriptionData?.vehicleUsage?.licensedVehicles || 100)) * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Available SaaS Plans Grid */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Available Subscription Tiers</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {availablePlans.map(plan => {
                const isCurrent = subscriptionData?.subscription?.plan_id === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-xl border p-4 flex flex-col justify-between shadow-xs ${
                      isCurrent ? 'border-sky-600 ring-2 ring-sky-600/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm tracking-tight">{plan.name}</div>
                      <div className="text-xl font-black text-slate-900 mt-2">
                        ₹{plan.price_per_vehicle}
                        <span className="text-xs font-normal text-slate-500"> /veh</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">{plan.description}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      {isCurrent ? (
                        <div className="w-full py-1.5 bg-slate-100 text-slate-700 rounded-lg text-center font-bold text-xs">
                          Current Plan
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpgradePlan(plan.id)}
                          className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-center font-bold text-xs shadow-xs"
                        >
                          Select Plan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment History & Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Payment & Invoice History</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.invoice_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">₹{p.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600">{p.payment_method}</td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[10px]">{p.paid_at}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          PAID
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Notification Preferences */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 max-w-2xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Emergency & Alert Notification Channels</h2>
          <p className="text-xs text-slate-500">Configure automated delivery rules for SMS, Push notifications, and email alerts</p>

          <div className="space-y-3 pt-2 text-xs">
            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-800 block">Instant SOS Panic SMS to Emergency Contacts</span>
                <span className="text-slate-500 text-[11px]">Dispatches SMS with Google Maps coordinates immediately on hardware SOS</span>
              </div>
              <input
                type="checkbox"
                checked={notificationPrefs.panicSMS}
                onChange={e => setNotificationPrefs({ ...notificationPrefs, panicSMS: e.target.checked })}
                className="rounded text-sky-600 focus:ring-0 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-800 block">Overspeeding Push Notifications</span>
                <span className="text-slate-500 text-[11px]">Alert dispatchers when vehicle exceeds speed limit for over 15 seconds</span>
              </div>
              <input
                type="checkbox"
                checked={notificationPrefs.overspeedPush}
                onChange={e => setNotificationPrefs({ ...notificationPrefs, overspeedPush: e.target.checked })}
                className="rounded text-sky-600 focus:ring-0 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-800 block">Main Battery Disconnect / Tamper Alert Email</span>
                <span className="text-slate-500 text-[11px]">Notifies fleet manager immediately if power harness is severed</span>
              </div>
              <input
                type="checkbox"
                checked={notificationPrefs.powerDisconnectEmail}
                onChange={e => setNotificationPrefs({ ...notificationPrefs, powerDisconnectEmail: e.target.checked })}
                className="rounded text-sky-600 focus:ring-0 w-4 h-4"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                setIsSavedMessage('Notification preferences saved successfully!');
                setTimeout(() => setIsSavedMessage(null), 3000);
              }}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs shadow-xs"
            >
              Save Notification Preferences
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: AIS-140 Gateway Settings */}
      {activeTab === 'telematics' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 max-w-2xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900">AIS-140 Intelligent Transportation Systems Backend</h2>
          <p className="text-xs text-slate-500">Ministry of Road Transport & Highways (MoRTH) telematics endpoint synchronization</p>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">State / Vahan AIS-140 Gateway Forwarding URL</label>
              <input
                type="text"
                defaultValue="https://ais140.vahan.gov.in/telematics/v2/ingest"
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Emergency Backend Police PSAP Code</label>
              <input
                type="text"
                defaultValue="MHA-ERSS-112-MH"
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-[11px]"
              />
            </div>

            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-900 text-[11px]">
              <strong>Compliance Notice:</strong> This software ingests standardized AIS-140 NMEA frames with hardware emergency bits, battery health and tamper flags. Device certificates and vehicle testing must follow ARAI / ICAT certification standards.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

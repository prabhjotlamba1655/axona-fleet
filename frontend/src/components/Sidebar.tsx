import React from 'react';
import axonaLogo from '../assets/axona-logo.jpg';
import {
  LayoutDashboard,
  Navigation,
  Truck,
  History,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  MapPin,
  FileSpreadsheet,
  Users,
  Settings,
  Radio,
  Building2,
  BrainCircuit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavItem =
  | 'dashboard'
  | 'live-tracking'
  | 'vehicles'
  | 'trips'
  | 'driver-intelligence'
  | 'panic'
  | 'devices'
  | 'geofences'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  onTabChange: (tab: NavItem) => void;
  panicCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  panicCount = 0,
  isOpen = true,
  onClose
}) => {
  const { user } = useAuth();
  const userRole = user?.role || 'company_admin';

  // Navigation items with role permissions
  const navItems = [
    {
      id: 'dashboard' as NavItem,
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'company_admin', 'individual_owner', 'sub_user']
    },
    {
      id: 'live-tracking' as NavItem,
      label: 'Live Tracking',
      icon: Navigation,
      roles: ['super_admin', 'company_admin', 'individual_owner', 'sub_user']
    },
    {
      id: 'vehicles' as NavItem,
      label: 'My Vehicles',
      icon: Truck,
      roles: ['super_admin', 'company_admin', 'individual_owner', 'sub_user']
    },
    {
      id: 'trips' as NavItem,
      label: 'Trip History',
      icon: History,
      roles: ['super_admin', 'company_admin', 'individual_owner', 'sub_user']
    },
    {
      id: 'driver-intelligence' as NavItem,
      label: 'Driver Intelligence',
      icon: BrainCircuit,
      roles: ['super_admin', 'company_admin', 'individual_owner', 'sub_user']
    },
    {
      id: 'panic' as NavItem,
      label: 'Panic Alerts',
      icon: AlertTriangle,
      badge: panicCount > 0 ? panicCount : null,
      badgeColor: 'bg-rose-500 text-white',
      roles: ['super_admin', 'company_admin', 'individual_owner', 'sub_user']
    },
    {
      id: 'devices' as NavItem,
      label: 'Device Management',
      icon: Cpu,
      roles: ['super_admin', 'company_admin', 'individual_owner']
    },
    {
      id: 'geofences' as NavItem,
      label: 'Geofencing',
      icon: MapPin,
      roles: ['super_admin', 'company_admin']
    },
    {
      id: 'reports' as NavItem,
      label: 'Reports',
      icon: FileSpreadsheet,
      roles: ['super_admin', 'company_admin', 'individual_owner', 'sub_user']
    },
    {
      id: 'users' as NavItem,
      label: 'User Management',
      icon: Users,
      roles: ['super_admin', 'company_admin']
    },
    {
      id: 'settings' as NavItem,
      label: 'Settings',
      icon: Settings,
      roles: ['super_admin', 'company_admin', 'individual_owner']
    }
  ];

  const filteredItems = navItems.filter(item => {
    if (userRole === 'super_admin') return true;
    return item.roles.includes(userRole);
  });

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-navy-950 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-navy-800 bg-navy-900">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-slate-700/40 shrink-0 overflow-hidden">
            <img src={axonaLogo} alt="Axona Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-white flex items-center">
              AXONA <span className="text-sky-400 font-semibold ml-1.5 text-xs px-1.5 py-0.5 rounded bg-sky-950/70 border border-sky-800/60">AIS-140</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Fleet Management</div>
          </div>
        </div>
      </div>

      {/* Tenant / Organization Pill */}
      <div className="px-4 py-3 bg-navy-900/60 border-b border-navy-850">
        <div className="flex items-center space-x-2 text-xs text-slate-300">
          <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-medium truncate">{user?.tenantName || 'Apex Commercial Logistics'}</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-navy-850 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-700 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Branding */}
      <div className="p-4 border-t border-navy-850 bg-navy-900/40 text-center">
        <div className="text-[11px] text-slate-400 font-medium">Developed by</div>
        <div className="text-xs font-semibold text-slate-300">Axona Software LLP</div>
        <div className="text-[10px] text-slate-500 mt-1">Enterprise Telematics Platform v1.4</div>
      </div>
    </aside>
  );
};

export default Sidebar;

import React from 'react';
import { 
  LayoutGrid, Weight, ThermometerSnowflake, 
  Cpu, Settings, ShieldCheck, Truck, Fuel, MapPin, Gauge, Menu, Layers
} from 'lucide-react';
import axonaLogo from '../assets/axona-brand-logo.png';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ activeView, setActiveView, onOpenSettings, setSidebarCollapsed }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  // Reordered dashboards:
  // 1. Executive NOC Dashboard
  // 2. Vehicle Master Register & Reports
  // 3. Live Map & Fleet Tracking (shifted below Vehicle Master Register)
  // 4. Live Fuel 3D Tank (shifted below Vehicle Master Register)
  // 5. Axle Payload
  // 6. Cold Chain & Reefer
  // (Integrations Dashboard is placed inside Settings)
  const primaryDashboards = [
    {
      id: 'screen3',
      label: 'Executive NOC',
      sublabel: 'Command Telemetry',
      icon: Gauge,
      badge: 'LIVE'
    },
    {
      id: 'screen3_table',
      label: 'Vehicle Register',
      sublabel: 'Master Table & Reports',
      icon: LayoutGrid,
      badge: 'MASTER'
    },
    {
      id: 'alert_matrix',
      label: 'Alert & Report Dashboard',
      sublabel: 'Cross-Tab Audit Matrix',
      icon: Layers,
      badge: 'MATRIX'
    },
    {
      id: 'screen2',
      label: 'Driver Intelligence and Live tracking',
      sublabel: 'GPS Corridor Telematics',
      icon: MapPin,
      badge: 'GPS'
    },
    {
      id: 'screen4',
      label: 'Live Fuel 3D Tank',
      sublabel: 'Digital Sensor Fuel 3D',
      icon: Truck,
      badge: '3D'
    },
    {
      id: 'axle',
      label: 'Axle Payload',
      sublabel: 'Load & Overweight Audit',
      icon: Weight,
      badge: null
    },
    {
      id: 'cold_chain',
      label: 'Cold Chain Reefer',
      sublabel: 'Temperature Telemetry',
      icon: ThermometerSnowflake,
      badge: 'ALERT'
    }
  ];

  return (
    <aside className={`w-60 ${isLight ? 'bg-white border-r border-slate-200' : 'bg-[#0A1128] border-r border-[#1E2E56]'} flex flex-col justify-between select-none h-full shrink-0 z-40 transition-colors duration-200`}>
      {/* Top Section: Main Navigation */}
      <div className="p-2 space-y-3 overflow-y-auto">
        {/* Core Dashboards Panel */}
        <div>
          <div className="px-1.5 mb-1.5 flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-300'} font-mono`}>
              Core Dashboards
            </span>
            <button
              onClick={() => setSidebarCollapsed && setSidebarCollapsed(true)}
              className={`p-1 rounded transition flex items-center justify-center ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-cyan-800 border border-slate-300' 
                  : 'bg-[#0D1730] hover:bg-[#1E2E56] text-slate-400 hover:text-cyan-400 border border-slate-700/60 hover:border-cyan-500/50'
              }`}
              title="Hide Menu Bar"
            >
              <Menu size={13} />
            </button>
          </div>
          <div className="space-y-1">
            {primaryDashboards.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition text-xs font-medium cursor-pointer ${
                    isActive
                      ? (isLight 
                          ? 'bg-cyan-50 text-cyan-900 border border-cyan-400 shadow-xs font-bold' 
                          : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950')
                      : (isLight 
                          ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent' 
                          : 'text-slate-300 hover:bg-[#0D1730] hover:text-white border border-transparent')
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <Icon size={17} className={`shrink-0 ${isActive ? (isLight ? 'text-cyan-700' : 'text-cyan-400') : (isLight ? 'text-slate-500' : 'text-slate-400')}`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[12.5px] leading-snug whitespace-normal break-words">{item.label}</div>
                      <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} truncate leading-tight mt-0.5`}>{item.sublabel}</div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0 ml-1.5 ${
                      item.badge === 'ALERT' || item.badge === 'Alert'
                        ? (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-950 text-rose-300 border border-rose-800')
                        : item.badge === 'LIVE'
                        ? (isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-950 text-emerald-300 border border-emerald-800')
                        : item.badge === 'GPS'
                        ? (isLight ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-blue-950 text-blue-300 border border-blue-800')
                        : item.badge === '3D'
                        ? (isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800')
                        : (isLight ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-cyan-950 text-cyan-300 border border-cyan-800')
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Single Unified Settings Dashboard */}
      <div className={`p-2 border-t ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1E2E56] bg-[#070D1F]'}`}>
        <div className={`px-1.5 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-300'} font-mono`}>
          System Configuration
        </div>

        {/* Single Settings Dashboard Button */}
        <button
          onClick={() => onOpenSettings('vehicle_reg')}
          className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl text-left transition group cursor-pointer shadow-sm ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300' 
              : 'bg-[#0D1730] hover:bg-[#152347] text-slate-200 hover:text-white border border-[#1E2E56] hover:border-cyan-500/50'
          }`}
          title="Open Unified Settings Dashboard (Vehicle Registration, Integrations, RBAC & Calibration)"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className={`p-2 rounded-lg ${isLight ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/60'} group-hover:rotate-45 transition duration-300 shrink-0`}>
              <Settings size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'} text-[13px] leading-tight`}>Settings</div>
              <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} truncate leading-tight mt-0.5`}>
                Integrations, Fleet & Rules
              </div>
            </div>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
            isLight ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
          } shrink-0 ml-1.5`}>
            CONFIG
          </span>
        </button>

        {/* Axona Version watermark */}
        <div className={`mt-2 pt-2 border-t ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-400'} flex items-center justify-between text-[10px] font-mono`}>
          <div className="flex items-center space-x-1.5 truncate">
            <img src={axonaLogo} alt="Axona" className="h-4 w-auto object-contain shrink-0" />
            <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'} truncate`}>Axona AI Fleet</span>
          </div>
          <span className={`${isLight ? 'text-emerald-600' : 'text-emerald-400'} shrink-0 font-semibold`}>● 100% Synced</span>
        </div>
      </div>
    </aside>
  );
}

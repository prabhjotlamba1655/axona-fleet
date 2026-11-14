import React, { useState } from 'react';
import axonaLogo from '../assets/axona-logo.jpg';
import {
  Menu,
  Bell,
  Volume2,
  VolumeX,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  Shield,
  Activity,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import audioAlert from '../services/audioService';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenPanicModal?: () => void;
  activePanicCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenPanicModal,
  activePanicCount = 0
}) => {
  const { user, demoUsers, switchUserRole, logout } = useAuth();
  const [isMuted, setIsMuted] = useState(audioAlert.getIsMuted());
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    audioAlert.setMuted(next);
    setIsMuted(next);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden flex items-center space-x-2">
          <img src={axonaLogo} alt="Axona" className="w-6 h-6 object-contain" />
          <span className="font-extrabold text-slate-900 text-sm tracking-tight">AXONA</span>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-500">
          <span className="flex items-center text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
            AIS-140 Gateway Live
          </span>
        </div>
      </div>

      {/* Center/Right: Panic Alert Banner if emergency active */}
      <div className="flex items-center space-x-3">
        {activePanicCount > 0 && (
          <button
            onClick={onOpenPanicModal}
            className="flex items-center space-x-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold animate-panic shadow-sm transition-transform active:scale-95"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>{activePanicCount} SOS PANIC ALERT ACTIVE</span>
          </button>
        )}

        {/* Mute Siren Button */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
          className={`p-2 rounded-lg border text-xs font-medium flex items-center space-x-1 ${
            isMuted
              ? 'bg-slate-100 text-slate-500 border-slate-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-rose-600" />}
        </button>

        {/* Role Switcher (For demo and evaluator testing) */}
        <div className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition"
          >
            <Shield className="w-3.5 h-3.5 text-sky-600" />
            <div className="text-left hidden md:block">
              <span className="font-semibold text-slate-800">{user?.roleName || 'Role'}</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Role Switcher</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                Switch Evaluation Role
              </div>
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUserRole(u.id);
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 flex items-start space-x-2.5 transition ${
                    user?.id === u.id ? 'bg-sky-50 text-sky-900 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <UserCheck className={`w-4 h-4 mt-0.5 shrink-0 ${user?.id === u.id ? 'text-sky-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-medium text-slate-900">{u.role_name}</div>
                    <div className="text-[11px] text-slate-500">{u.name} ({u.tenant_name})</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Info & Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</div>
            <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{user?.email}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="ml-1 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

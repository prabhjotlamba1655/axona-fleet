import React, { useState, useEffect } from 'react';
import { 
  Tv, Maximize2, Minimize2, Play, Pause, FastForward, 
  Wifi, ShieldAlert, MonitorUp, Home, ArrowLeft, Volume2, VolumeX, Menu,
  Sun, Moon, Sparkles, ShieldCheck, Lock, Radio, FileCheck, AlertOctagon, Activity
} from 'lucide-react';
import axonaLogo from '../assets/axona-brand-logo.png';
import FunctionalityGuideModal from './views/FunctionalityGuideModal';
import Ais140SosModal from './views/Ais140SosModal';
import Ais140FitmentModal from './views/Ais140FitmentModal';
import Ais140CdacModal from './views/Ais140CdacModal';

export default function Navbar({
  activeView,
  setActiveView,
  autoScrollEnabled,
  setAutoScrollEnabled,
  scrollSpeed,
  setScrollSpeed,
  wsConnected,
  unreadAlertCount,
  openTvWindows,
  sidebarCollapsed,
  setSidebarCollapsed,
  theme = 'light',
  toggleTheme,
  selectedProfile = 'Advanced',
  setSelectedProfile
}) {
  const isLight = theme === 'light';
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showFitmentModal, setShowFitmentModal] = useState(false);
  const [showCdacModal, setShowCdacModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const formattedTime = time.toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const dd = String(time.getDate()).padStart(2, '0');
  const mm = String(time.getMonth() + 1).padStart(2, '0');
  const yyyy = time.getFullYear();
  const formattedDate = `${dd}/${mm}/${yyyy}`;

  return (
    <header className={`h-12 ${isLight ? 'bg-white/95 border-b border-slate-200 shadow-xs' : 'bg-[#070D1F]/95 border-b border-[#1E2E56] shadow-lg'} px-3.5 flex items-center justify-between select-none z-50 sticky top-0 transition-colors duration-200`}>
      {/* Brand & Logo on Top Left */}
      <div className="flex items-center space-x-3">
        {/* Axona AI Fleet Analytics Logo & Title */}
        <div 
          className="flex items-center space-x-2.5 cursor-pointer group"
          onClick={() => setActiveView('screen3')}
          title="Return to Executive NOC Dashboard (Screen 3)"
        >
          {/* Theme-blended Logo container */}
          <div className={`relative flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200 shrink-0 ${
            isLight 
              ? 'bg-white border border-slate-200 shadow-sm group-hover:border-cyan-500/60 group-hover:shadow-md' 
              : 'bg-gradient-to-b from-[#0e1d3d] to-[#060D1F] border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] group-hover:border-cyan-400 group-hover:shadow-[0_0_18px_rgba(6,182,212,0.45)]'
          }`}>
            <img 
              src={axonaLogo} 
              alt="Axona Logo" 
              className="h-7 w-auto object-contain transform group-hover:scale-105 transition duration-200" 
            />
          </div>

          {/* Professional Typography */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center space-x-1.5 leading-none">
              <span className={`font-extrabold tracking-wider text-[17px] font-['Chakra_Petch',sans-serif] ${
                isLight 
                  ? 'text-slate-900 drop-shadow-xs' 
                  : 'bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent'
              }`}>
                AXONA
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black border shadow-xs tracking-wider ${
                isLight 
                  ? 'bg-cyan-50 text-cyan-800 border-cyan-300' 
                  : 'bg-gradient-to-r from-cyan-500/25 to-blue-600/30 text-cyan-300 border-cyan-400/50'
              }`}>
                AI
              </span>
              <span className={`text-[13px] font-bold tracking-widest uppercase font-mono ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                Fleet Analytics
              </span>
            </div>
            <div className="text-[9.5px] font-mono tracking-tight mt-0.5 flex items-center space-x-2">
              <span className={`${isLight ? 'text-cyan-700' : 'text-cyan-400/90'} font-medium`}>
                Enterprise Telematics NOC
              </span>
              <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>●</span>
              <span className={`${isLight ? 'text-emerald-700' : 'text-emerald-400'} flex items-center space-x-1 font-semibold`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Fleet Telemetry</span>
              </span>
            </div>
          </div>
        </div>

        {/* Reset View Button for Viewing the Side Panel when Hidden */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-200 transform hover:scale-[1.02] cursor-pointer ml-3 animate-in fade-in ${
              isLight 
                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 shadow-xs' 
                : 'bg-gradient-to-r from-[#0C1D4A] to-[#0A2E5C] hover:from-[#112966] hover:to-[#0E3D7A] text-cyan-300 hover:text-white border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
            }`}
            title="Reset View: Show Side Panel"
          >
            <Menu size={14} className="text-cyan-500" />
            <span>Show Side Panel</span>
          </button>
        )}
      </div>

      {/* Right Controls: Theme Switcher & Live Clock */}
      <div className="flex items-center space-x-2.5">
        
        {/* AIS-140 Compliance Suite Small Tabs */}
        <div className={`flex items-center p-0.5 rounded-xl border text-xs font-mono shadow-xs select-none ${
          isLight 
            ? 'bg-slate-100/90 border-slate-300' 
            : 'bg-[#060F24] border-slate-700/80 shadow-inner'
        }`}>
          <div className="flex items-center space-x-1.5 px-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            <Radio size={13} className="text-cyan-400 animate-pulse" />
            <span className="hidden lg:inline font-bold">AIS-140:</span>
          </div>
          <div className="flex items-center space-x-1">
            {/* Tab 1: SOS Panic Button Queue */}
            <button
              type="button"
              onClick={() => setShowSosModal(true)}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-bold font-mono bg-rose-950/80 hover:bg-rose-900 border border-rose-600/70 text-rose-300 shadow-sm transition cursor-pointer"
              title="Open AIS-140 SOS Panic Button Emergency Queue (MoRTH / ERSS 112)"
            >
              <AlertOctagon size={11} className="text-rose-400 animate-pulse shrink-0" />
              <span>SOS Panic</span>
              <span className="bg-rose-600 text-white text-[8.5px] px-1 py-0.2 rounded-full font-black animate-pulse">1</span>
            </button>

            {/* Tab 2: RTO Fitment Certificate */}
            <button
              type="button"
              onClick={() => setShowFitmentModal(true)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer ${
                isLight 
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300' 
                  : 'bg-amber-950/70 hover:bg-amber-900/80 border border-amber-600/50 text-amber-300'
              }`}
              title="Generate MoRTH Form 22 AIS-140 RTO Fitment Certificate with QR Code"
            >
              <FileCheck size={11} className="text-amber-400 shrink-0" />
              <span>Fitment Cert</span>
            </button>

            {/* Tab 3: State CDAC Sync Monitor */}
            <button
              type="button"
              onClick={() => setShowCdacModal(true)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer ${
                isLight 
                  ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-300' 
                  : 'bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-600/50 text-cyan-300'
              }`}
              title="Monitor State Government (CDAC) Dual-IP Heartbeat Gateway"
            >
              <Activity size={11} className="text-emerald-400 shrink-0" />
              <span>CDAC Sync</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            </button>
          </div>
        </div>

        {/* Profile Plan Selector (Basic / Standard / Advanced) */}
        <div className={`flex items-center p-0.5 rounded-xl border text-xs font-mono shadow-xs select-none ${
          isLight 
            ? 'bg-slate-100/90 border-slate-300' 
            : 'bg-[#060F24] border-slate-700/80 shadow-inner'
        }`}>
          <div className="flex items-center space-x-1.5 px-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            <ShieldCheck size={13} className={
              selectedProfile === 'Advanced' ? 'text-purple-400' :
              selectedProfile === 'Standard' ? 'text-cyan-400' :
              'text-emerald-400'
            } />
            <span className="hidden md:inline font-bold">Profile:</span>
          </div>
          <div className="flex items-center space-x-1">
            {[
              { id: 'Basic', label: 'Basic' },
              { id: 'Standard', label: 'Standard' },
              { id: 'Advanced', label: 'Advanced' }
            ].map(tier => {
              const isActive = (selectedProfile || 'Advanced') === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedProfile && setSelectedProfile(tier.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all duration-150 cursor-pointer ${
                    isActive
                      ? tier.id === 'Advanced'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/50 scale-[1.02]'
                        : tier.id === 'Standard'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/50 scale-[1.02]'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/50 scale-[1.02]'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={`Switch to ${tier.label} Profile Plan`}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dummy Data & Functionality Guide Trigger */}
        <button
          onClick={() => setShowGuideModal(true)}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold transition shadow-xs cursor-pointer select-none ${
            isLight 
              ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300' 
              : 'bg-[#0B1D42] hover:bg-[#122A5C] text-cyan-300 border-cyan-500/50'
          }`}
          title="Explore Platform Functionalities & Live Dummy Data Scenarios"
        >
          <Sparkles size={13} className="text-cyan-500 animate-pulse" />
          <span className="text-[11px] font-bold">Dummy Data Guide</span>
        </button>

        {/* Theme Switcher Toggle (Light vs Dark) */}
        {toggleTheme && (
          <button
            onClick={toggleTheme}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold transition shadow-sm cursor-pointer select-none ${
              theme === 'light'
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-amber-100'
                : 'bg-[#0B1530] hover:bg-[#12224D] text-cyan-300 border-cyan-500/50 shadow-cyan-900/30'
            }`}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <>
                <Sun size={14} className="text-amber-600 animate-spin-slow" />
                <span className="text-[11px] font-bold">Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={14} className="text-cyan-400" />
                <span className="text-[11px] font-bold">Dark Mode</span>
              </>
            )}
          </button>
        )}

        {/* Live NOC Clock & Telemetry Status */}
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border text-xs font-mono shadow-xs ${
          isLight 
            ? 'bg-slate-100/90 border-slate-200 text-slate-800' 
            : 'bg-[#060B18] border-[#1E2E56] text-slate-300 shadow-inner'
        }`}>
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className={`${isLight ? 'text-slate-700' : 'text-slate-300'} font-medium tracking-wider`}>
            {formattedDate} <span className={`${isLight ? 'text-cyan-700' : 'text-cyan-400'} font-bold ml-1`}>{formattedTime}</span> IST
          </span>
        </div>
      </div>

      
      {/* AIS-140 Compliance Suite Modals */}
      <Ais140SosModal isOpen={showSosModal} onClose={() => setShowSosModal(false)} />
      <Ais140FitmentModal isOpen={showFitmentModal} onClose={() => setShowFitmentModal(false)} />
      <Ais140CdacModal isOpen={showCdacModal} onClose={() => setShowCdacModal(false)} />

      {/* Functionality Guide Modal */}
      <FunctionalityGuideModal 
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onNavigate={(screen) => {
          setActiveView(screen);
          setShowGuideModal(false);
        }}
      />
    </header>
  );
}

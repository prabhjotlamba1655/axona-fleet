import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Screen1DieselSavings from './components/Screen1DieselSavings';
import Screen2LiveMapTracking from './components/Screen2LiveMapTracking';
import Screen3FleetOverview from './components/Screen3FleetOverview';
import Screen4LiveFuelTank3D from './components/Screen4LiveFuelTank3D';
import ExecutiveNocDashboard from './components/ExecutiveNocDashboard';
import RtoComplianceView from './components/views/RtoComplianceView';
import AxlePayloadView from './components/views/AxlePayloadView';
import CostProfitabilityView from './components/views/CostProfitabilityView';
import ColdChainReeferView from './components/views/ColdChainReeferView';
import AlertReportDashboard from './components/views/AlertReportDashboard';
import IotSensorView from './components/views/IotSensorView';
import SettingsModal from './components/views/SettingsModal';
import { connectWebSocket, fetchAlerts } from './services/api';
import { Maximize2, Minimize2, Home, ArrowLeft, Menu } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  // Check if standalone TV screen mode requested via URL parameter (e.g. ?tv_screen=1)
  const urlParams = new URLSearchParams(window.location.search);
  const standaloneTvScreen = urlParams.get('tv_screen');

  // Guideline 1: "In Home screen by default, there would be display of Fleet Overview (Screen 3) with left side menu bar."
  const [activeView, setActiveView] = useState(
    standaloneTvScreen ? `screen${standaloneTvScreen}` : 'screen3'
  );

  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState('normal'); // 'slow', 'normal', 'fast'
  const [wsConnected, setWsConnected] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(() => {
    return localStorage.getItem('axona_profile_plan') || 'Advanced';
  });

  const handleProfileChange = (plan) => {
    setSelectedProfile(plan);
    localStorage.setItem('axona_profile_plan', plan);
    window.dispatchEvent(new CustomEvent('axona_plan_changed', { detail: plan }));
  };

  // Settings Modal State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('vehicle_reg');

  // Connect WebSocket & load alerts count
  useEffect(() => {
    fetchAlerts().then(alerts => {
      setUnreadAlertCount(alerts.filter(a => a.is_acknowledged === 0).length);
    }).catch(err => console.error(err));

    const disconnect = connectWebSocket(
      (msg) => {
        if (msg.type === 'NEW_ALERT' || msg.type === 'ALERT_ACKNOWLEDGED') {
          fetchAlerts().then(alerts => {
            setUnreadAlertCount(alerts.filter(a => a.is_acknowledged === 0).length);
          });
        }
      },
      () => setWsConnected(true),
      () => setWsConnected(false)
    );

    return () => disconnect();
  }, []);

  // Guideline 4: "Keep provision of Esc button or some Home button to go back into home screen."
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      } else if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (activeView !== 'screen3') {
          setActiveView('screen3'); // Return to Home screen!
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, settingsOpen]);

  // Guideline 5: "If client is using 4 separate TV Screens, to work like NOC then keep provision so that all four screen should appear on all four TV screens parallelly."
  const openTvWindows = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const screens = [
      { name: 'Axona TV 1 - Diesel Savings', url: `${baseUrl}?tv_screen=1` },
      { name: 'Axona TV 2 - Live GPS & Alerts', url: `${baseUrl}?tv_screen=2` },
      { name: 'Axona TV 3 - Fleet Overview', url: `${baseUrl}?tv_screen=3` },
      { name: 'Axona TV 4 - 3D Fuel Tank', url: `${baseUrl}?tv_screen=4` }
    ];

    screens.forEach((s, idx) => {
      const w = 1200;
      const h = 800;
      const left = (idx % 2) * 600;
      const top = Math.floor(idx / 2) * 450;
      window.open(s.url, `TV_Window_${idx + 1}`, `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,status=no`);
    });
  };

  // Standalone TV Monitor View (Fullscreen dedicated monitor mode without sidebars)
  if (standaloneTvScreen) {
    return (
      <div className="h-screen w-screen bg-[#060B18] overflow-hidden flex flex-col p-2">
        <div className="h-10 bg-[#0A1128] border border-[#1E2E56] rounded-lg px-4 flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-cyan-400 font-['Chakra_Petch']">AXONA NOC DEDICATED TV MONITOR {standaloneTvScreen}</span>
            <span className="text-xs text-slate-400 font-mono">| Real-time Command Display</span>
          </div>
          <a href={window.location.origin + window.location.pathname} className="text-xs text-cyan-300 hover:underline font-mono">
            Exit TV Standalone Mode (Home)
          </a>
        </div>
        <div className="flex-1 overflow-hidden">
          {standaloneTvScreen === '1' && <Screen1DieselSavings isExpanded={true} />}
          {standaloneTvScreen === '2' && <Screen2LiveMapTracking isExpanded={true} />}
          {standaloneTvScreen === '3' && <ExecutiveNocDashboard autoScrollSpeed={scrollSpeed} />}
          {standaloneTvScreen === '4' && <Screen4LiveFuelTank3D isExpanded={true} />}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen ${theme === 'light' ? 'theme-light bg-[#F1F5F9] text-slate-800' : 'bg-[#060B18] text-slate-100'} flex flex-col overflow-hidden font-sans transition-colors duration-200`}>
      {/* Top Navbar with Blended Axona Logo & Axona AI Fleet Analytics Branding */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        autoScrollEnabled={autoScrollEnabled}
        setAutoScrollEnabled={setAutoScrollEnabled}
        scrollSpeed={scrollSpeed}
        setScrollSpeed={setScrollSpeed}
        wsConnected={wsConnected}
        unreadAlertCount={unreadAlertCount}
        openTvWindows={openTvWindows}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        theme={theme}
        toggleTheme={toggleTheme}
        selectedProfile={selectedProfile}
        setSelectedProfile={handleProfileChange}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Menu Bar with Smooth Collapse/Expand */}
        <div className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          sidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-60 opacity-100'
        }`}>
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            onOpenSettings={(tab) => {
              setSettingsTab(tab);
              setSettingsOpen(true);
            }}
            setSidebarCollapsed={setSidebarCollapsed}
          />
        </div>

        {/* Center / Right Content Stage */}
        <main className={`flex-1 ${theme === 'light' ? 'bg-[#F1F5F9]' : 'bg-[#060B18]'} overflow-hidden p-2 relative transition-colors duration-200`}>
          {/* Reset View floating handle pinned to the left edge when side panel is hidden */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className={`absolute left-0 top-16 z-40 ${
                theme === 'light'
                  ? 'bg-white/95 hover:bg-slate-100 text-cyan-800 border-cyan-400 shadow-md'
                  : 'bg-[#0A1128]/95 hover:bg-[#12234e] text-cyan-400 hover:text-white border-cyan-500/60 shadow-[0_0_16px_rgba(6,182,212,0.35)]'
              } border border-l-0 rounded-r-xl px-2 py-3 flex flex-col items-center space-y-1.5 text-[10px] font-mono font-bold group transition cursor-pointer backdrop-blur-md animate-in slide-in-from-left duration-200`}
              title="Reset View: Show Left Side Navigation Panel"
            >
              <Menu size={15} className="text-cyan-400 group-hover:scale-110 transition" />
              <span className="[writing-mode:vertical-lr] tracking-widest uppercase text-slate-300 group-hover:text-cyan-300">Side Panel</span>
            </button>
          )}

          {/* Back to Home / Esc floating pill when not on default home or Screen 4 or Axle or Cold Chain or Alert Matrix */}
          {activeView !== 'screen3' && activeView !== 'screen4' && activeView !== 'axle' && activeView !== 'cold_chain' && activeView !== 'alert_matrix' && (
            <div className="absolute top-4 right-4 z-40">
              <button
                onClick={() => setActiveView('screen3')}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 text-xs font-mono shadow-lg transition backdrop-blur-md"
              >
                <Home size={13} />
                <span>Return to Home (Esc)</span>
              </button>
            </div>
          )}

          {/* VIEW ROUTING */}

          {/* 1. DEFAULT HOME SCREEN: REDESIGNED EXECUTIVE NOC DASHBOARD (4 Rows + Auto-Scroll Alerts) */}
          {(activeView === 'screen3' || activeView === 'dashboard') && (
            <div className="h-full">
              <ExecutiveNocDashboard
                onNavigateToScreen={(scr) => setActiveView(scr)}
                onOpenSettings={(tab) => {
                  setSettingsTab(tab);
                  setSettingsOpen(true);
                }}
                autoScrollSpeed={scrollSpeed}
                selectedProfile={selectedProfile}
                setSelectedProfile={handleProfileChange}
              />
            </div>
          )}

          {/* 1B. FLEET MASTER REGISTER TABLE VIEW */}
          {activeView === 'screen3_table' && (
            <div className="h-full">
              <Screen3FleetOverview
                isExpanded={true}
                onToggleExpand={() => setActiveView('all_screens')}
                autoScrollEnabled={autoScrollEnabled}
                scrollSpeed={scrollSpeed}
              />
            </div>
          )}

          {/* 2. ALL SCREENS: 4-in-1 Partition View with Screen Names on Top */}
          {activeView === 'all_screens' && (
            <div className="h-full grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2.5 overflow-hidden">
              {/* Partition 1: Screen 1 - Diesel Savings 5 Pillars */}
              <div 
                className="h-full overflow-hidden cursor-pointer group transition transform hover:ring-1 hover:ring-cyan-500/60 rounded-xl"
                onClick={() => setActiveView('screen1')}
              >
                <Screen1DieselSavings
                  isExpanded={false}
                  onToggleExpand={() => setActiveView('screen1')}
                />
              </div>

              {/* Partition 2: Screen 2 - Live Map & Fleet Tracking */}
              <div 
                className="h-full overflow-hidden cursor-pointer group transition transform hover:ring-1 hover:ring-cyan-500/60 rounded-xl"
                onClick={() => setActiveView('screen2')}
              >
                <Screen2LiveMapTracking
                  isExpanded={false}
                  onToggleExpand={() => setActiveView('screen2')}
                />
              </div>

              {/* Partition 3: Screen 3 - Fleet Overview */}
              <div 
                className="h-full overflow-hidden cursor-pointer group transition transform hover:ring-1 hover:ring-cyan-500/60 rounded-xl"
                onClick={() => setActiveView('screen3')}
              >
                <Screen3FleetOverview
                  isExpanded={false}
                  onToggleExpand={() => setActiveView('screen3')}
                  autoScrollEnabled={autoScrollEnabled}
                  scrollSpeed={scrollSpeed}
                />
              </div>

              {/* Partition 4: Screen 4 - Live Fuel 3D Tank */}
              <div 
                className="h-full overflow-hidden cursor-pointer group transition transform hover:ring-1 hover:ring-cyan-500/60 rounded-xl"
                onClick={() => setActiveView('screen4')}
              >
                <Screen4LiveFuelTank3D
                  isExpanded={false}
                  onToggleExpand={() => setActiveView('screen4')}
                />
              </div>
            </div>
          )}

          {/* 3. ENLARGED / FULL SCREEN INDIVIDUAL VIEWS */}
          {activeView === 'screen1' && (
            <div className="h-full">
              <Screen1DieselSavings
                isExpanded={true}
                onToggleExpand={() => setActiveView('all_screens')}
              />
            </div>
          )}

          {activeView === 'screen2' && (
            <div className="h-full">
              <Screen2LiveMapTracking
                isExpanded={true}
                onToggleExpand={() => setActiveView('all_screens')}
              />
            </div>
          )}

          {activeView === 'screen4' && (
            <div className="h-full">
              <Screen4LiveFuelTank3D
                isExpanded={true}
                onToggleExpand={() => setActiveView('all_screens')}
                onReturnHome={() => setActiveView('screen3')}
              />
            </div>
          )}

          {/* 4. LEFT MENU SPECIFIC VIEWS */}
          {activeView === 'alert_matrix' && (
            <div className="h-full">
              <AlertReportDashboard onReturnHome={() => setActiveView('screen3')} />
            </div>
          )}
          {activeView === 'rto' && <RtoComplianceView />}
          {activeView === 'axle' && (
            <AxlePayloadView
              onReturnHome={() => setActiveView('screen3')}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
            />
          )}
          {activeView === 'cost' && <CostProfitabilityView />}
          {activeView === 'cold_chain' && (
            <ColdChainReeferView
              onReturnHome={() => setActiveView('screen3')}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
            />
          )}
          {activeView === 'iot' && <IotSensorView />}
        </main>
      </div>

      {/* Settings Modal (RBAC, Vehicle Registration, Tank Calibration) */}
      {settingsOpen && (
        <SettingsModal
          initialTab={settingsTab}
          onClose={() => setSettingsOpen(false)}
          onVehicleSaved={() => {
            // Trigger refresh
            window.dispatchEvent(new Event('vehicle_updated'));
          }}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar, { NavItem } from './components/Sidebar';
import Header from './components/Header';

// 11 Feature Views
import DashboardView from './views/DashboardView';
import LiveTrackingView from './views/LiveTrackingView';
import VehiclesView from './views/VehiclesView';
import TripHistoryView from './views/TripHistoryView';
import DriverIntelligenceView from './views/DriverIntelligenceView';
import PanicAlertsView from './views/PanicAlertsView';
import DeviceManagementView from './views/DeviceManagementView';
import GeofencingView from './views/GeofencingView';
import ReportsView from './views/ReportsView';
import UserManagementView from './views/UserManagementView';
import SettingsView from './views/SettingsView';

import LoginView from './views/LoginView';
import { apiFetch, telematicsWS } from './services/api';
import audioAlert from './services/audioService';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activePanicCount, setActivePanicCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    telematicsWS.connect();
  }, [user]);

  // Poll for active 'New' panic alerts to update badge & trigger audio
  useEffect(() => {
    if (!user) return;
    const checkPanic = async () => {
      try {
        const alerts = await apiFetch<any[]>('/panic?status=New');
        setActivePanicCount(alerts.length);
        if (alerts.length > 0 && !audioAlert.getIsMuted()) {
          audioAlert.playPanicSiren(2000);
        }
      } catch (e) {
        // ignore
      }
    };

    checkPanic();
    const interval = setInterval(checkPanic, 6000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <div>Initializing Axona Fleet Telematics Gateway...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased">
      {/* Left Sidebar (11 Main Navigation Items) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        panicCount={activePanicCount}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenPanicModal={() => setCurrentTab('panic')}
          activePanicCount={activePanicCount}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTo={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'live-tracking' && <LiveTrackingView />}
          {currentTab === 'vehicles' && <VehiclesView />}
          {currentTab === 'trips' && <TripHistoryView />}
          {currentTab === 'driver-intelligence' && <DriverIntelligenceView />}
          {currentTab === 'panic' && <PanicAlertsView />}
          {currentTab === 'devices' && <DeviceManagementView />}
          {currentTab === 'geofences' && <GeofencingView />}
          {currentTab === 'reports' && <ReportsView />}
          {currentTab === 'users' && <UserManagementView />}
          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;

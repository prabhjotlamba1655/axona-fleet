import React, { useState, useEffect, useRef } from 'react';
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
  const [popup, setPopup] = useState<any | null>(null);
  const [popupSeconds, setPopupSeconds] = useState(15);
  const seenAlerts = useRef<Set<string>>(new Set());
  const alertsReady = useRef(false);

  const playAlertSound = (alert: any) => {
    const kind = alert.type || alert.alertType;
    if (kind === 'panic') audioAlert.playPanicSiren(2000);
    else if (kind === 'towing') audioAlert.playTowingAlarm();
    else if (kind === 'geofence') audioAlert.playAlertChime();
    else audioAlert.playSeverity(alert.severity || 'WARNING');
  };

  const raisePopup = (alert: any) => {
    setPopup(alert);
    setPopupSeconds(15);
    playAlertSound(alert);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const title = alert.title || 'Fleet alert';
      const body = [alert.registration_number || alert.registrationNumber, alert.address].filter(Boolean).join(' · ');
      new Notification(title, { body });
    }
  };

  useEffect(() => {
    if (!popup) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.ceil((15000 - (Date.now() - started)) / 1000);
      if (left <= 0) {
        setPopup(null);
        return;
      }
      setPopupSeconds(left);
    }, 250);
    return () => window.clearInterval(timer);
  }, [popup?.id]);

  useEffect(() => {
    if (!user) return;
    telematicsWS.connect();
    const poll = async () => {
      try {
        const stats = await apiFetch<{ recentAlerts: any[] }>('/tracking/dashboard-stats');
        const alerts = (stats.recentAlerts || []).filter(alert => {
          const kind = alert.type || alert.alertType;
          if (kind === 'panic' || kind === 'overspeed' || kind === 'towing') return true;
          if (kind === 'geofence') {
            const status = String(alert.status || '').toLowerCase();
            return status === 'entry' || status === 'exit';
          }
          return false;
        });
        if (!alertsReady.current) {
          alerts.forEach(alert => {
            if (alert.id) seenAlerts.current.add(alert.id);
          });
          alertsReady.current = true;
          return;
        }
        const fresh = alerts.filter(alert => alert.id && !seenAlerts.current.has(alert.id));
        if (fresh.length === 0) return;
        const next = fresh[fresh.length - 1];
        seenAlerts.current.add(next.id);
        raisePopup(next);
      } catch {
        // keep the last popup
      }
    };
    poll();
    const timer = setInterval(poll, 4000);
    return () => clearInterval(timer);
  }, [user]);

  // Poll for active 'New' panic alerts to update badge & trigger audio
  useEffect(() => {
    if (!user) return;
    const checkPanic = async () => {
      try {
        const alerts = await apiFetch<any[]>('/panic?status=New');
        setActivePanicCount(alerts.length);
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

        {popup && (
          <div className="fixed inset-0 z-[2000] bg-navy-950/70 flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-2xl bg-white shadow-2xl border-2 overflow-hidden ${popup.type === 'towing' ? 'border-violet-500' : popup.type === 'panic' ? 'border-rose-600' : 'border-amber-500'}`}>
              <div className={`text-white px-5 py-4 ${popup.type === 'towing' ? 'bg-violet-700' : popup.type === 'panic' ? 'bg-rose-700' : 'bg-amber-600'}`}>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                  {popup.type === 'panic' ? 'Emergency' : popup.type === 'towing' ? 'Towing' : 'Fleet alert'}
                </div>
                <div className="text-xl font-black mt-1">{popup.title || 'Alert'}</div>
              </div>
              <div className="px-5 py-4 text-sm text-slate-800 space-y-1">
                <div className="font-bold">{popup.registration_number || popup.registrationNumber}</div>
                <div>{popup.speed ?? '—'} km/h · {popup.eventTime || popup.event_time}</div>
                {popup.address && <div className="text-slate-600">{popup.address}</div>}
                {popup.severity && <div className="font-semibold text-rose-700">{popup.severity}</div>}
                <div className="text-[11px] text-slate-500 pt-1">Closes in {popupSeconds}s</div>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => setPopup(null)}
                  className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiFetch, getAuthToken, setAuthToken, clearAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  needsSetup: boolean;
  demoUsers: any[];
  login: (email: string, password: string) => Promise<void>;
  createAdministrator: (input: { name: string; email: string; password: string; organization: string }) => Promise<void>;
  switchUserRole: (userId: string) => Promise<void>;
  logout: () => void;
  hasRole: (allowed: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function storeSession(token: string, user: User) {
  setAuthToken(token);
  localStorage.setItem('axona_current_user', JSON.stringify(user));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const status = await apiFetch<{ needsSetup: boolean }>('/auth/setup-status');
        setNeedsSetup(status.needsSetup);
        const existing = getAuthToken();
        if (!existing || status.needsSetup) {
          if (status.needsSetup) clearAuthToken();
          return;
        }
        const me = await apiFetch<User>('/auth/me');
        setUser(me);
        setToken(existing);
        const users = await apiFetch<any[]>('/auth/demo-users');
        setDemoUsers(users);
      } catch {
        clearAuthToken();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const applySession = async (res: { token: string; user: User }) => {
    storeSession(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
    setNeedsSetup(false);
    try {
      const users = await apiFetch<any[]>('/auth/demo-users');
      setDemoUsers(users);
    } catch {
      setDemoUsers([]);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    await applySession(res);
  };

  const createAdministrator = async (input: { name: string; email: string; password: string; organization: string }) => {
    const res = await apiFetch<{ token: string; user: User }>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    await applySession(res);
  };

  const switchUserRole = async (userId: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    await applySession(res);
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setToken(null);
    setDemoUsers([]);
  };

  const hasRole = (allowed: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, needsSetup, demoUsers, login, createAdministrator, switchUserRole, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

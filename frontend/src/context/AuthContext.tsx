import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiFetch, getAuthToken, setAuthToken, clearAuthToken, telematicsWS } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  demoUsers: any[];
  switchUserRole: (userId: string) => Promise<void>;
  logout: () => void;
  hasRole: (allowed: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize demo users list and default session
  useEffect(() => {
    async function initAuth() {
      try {
        const users = await apiFetch<any[]>('/auth/demo-users');
        setDemoUsers(users);

        // Check if there is already a stored user session
        const storedUser = localStorage.getItem('axona_current_user');
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
        } else if (users.length > 0) {
          // Default to Company Admin (Apex Commercial Logistics) for full operational fleet view
          const defaultUser = users.find(u => u.role === 'company_admin') || users[0];
          await switchUserRole(defaultUser.id);
        }
      } catch (err) {
        console.error('Failed to init auth:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
    telematicsWS.connect();
  }, []);

  const switchUserRole = async (userId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch<{ token: string; user: User }>('/auth/switch-user', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      setAuthToken(res.token);
      localStorage.setItem('axona_current_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      console.error('Failed to switch user:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setToken(null);
  };

  const hasRole = (allowed: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true; // Super admin has global access
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, demoUsers, switchUserRole, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<User | null>;
  register: (payload: any) => Promise<User | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('medcore_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('medcore_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          patientProfileId: data.user.patientProfile?.id,
          doctorProfileId: data.user.doctorProfile?.id,
          preferredLanguage: data.user.patientProfile?.preferredLanguage || 'en',
        });
      } else {
        logout();
      }
    } catch (error) {
      console.warn('Failed to verify token on startup:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any): Promise<User | null> => {
    const data = await api.login(credentials);
    if (data.success && data.token) {
      localStorage.setItem('medcore_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    return null;
  };

  const register = async (payload: any): Promise<User | null> => {
    const data = await api.register(payload);
    if (data.success && data.token) {
      localStorage.setItem('medcore_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    return null;
  };

  const logout = () => {
    localStorage.removeItem('medcore_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

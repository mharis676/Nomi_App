import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  login: (role?: UserRole, name?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  canEdit: boolean;
  isOwner: boolean;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr-admin-1',
  fullName: 'Muhammad Usman (Managing Owner)',
  role: 'OWNER',
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('saudi_carry_auth_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('saudi_carry_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('saudi_carry_auth_user');
    }
  }, [user]);

  const login = (role: UserRole = 'OWNER', name = 'Muhammad Usman') => {
    const newUser: UserProfile = {
      id: 'usr-' + Date.now(),
      fullName: name,
      role,
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const role = user?.role || 'VIEWER';
  const isAuthenticated = !!user;
  const canEdit = role === 'OWNER' || role === 'STAFF';
  const isOwner = role === 'OWNER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        login,
        logout,
        isAuthenticated,
        canEdit,
        isOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

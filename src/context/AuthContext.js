'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // For demo purposes, using simple authentication
      // In production, this should call a secure API endpoint
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      if (username === adminUsername && password === adminPassword) {
        const userData = {
          id: 1,
          username: adminUsername,
          role: 'administrator',
          permissions: ['full_access']
        };
        
        localStorage.setItem('authToken', 'demo-token');
        localStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    router.push('/login');
  };

  const checkPermission = (permission) => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.permissions.includes('full_access');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, checkPermission, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

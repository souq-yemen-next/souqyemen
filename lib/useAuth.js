'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebaseClient'; // تأكد أن المسار صحيح

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // نسمع لأي تغيير في حالة تسجيل الدخول
    const unsub = auth.onAuthStateChanged((firebaseUser) => {
      console.log('onAuthStateChanged =>', firebaseUser);
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

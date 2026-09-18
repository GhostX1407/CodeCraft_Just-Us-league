import { useState, useEffect } from 'react';
import { authStore, AuthUser, UserRole } from '../services/authStore';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(authStore.getAuthUser());

  useEffect(() => {
    return authStore.subscribe((updated) => {
      setUser(updated);
    });
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    login: (username: string, password: string, role?: UserRole) => authStore.login(username, password, role),
    quickLogin: (role: UserRole) => authStore.quickLogin(role),
    logout: () => authStore.logout(),
  };
}

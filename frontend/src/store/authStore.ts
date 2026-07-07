import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '../lib/queryClient';

interface AuthUser {
  id: string;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        // Cached queries belong to the previous account; without this a newly
        // logged-in user sees the old user's recipes until a refetch lands.
        if (get().user?.id !== user.id) queryClient.clear();
        set({ user, accessToken });
      },
      setToken: (accessToken) => set({ accessToken }),
      logout: () => {
        set({ user: null, accessToken: null });
        queryClient.clear();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

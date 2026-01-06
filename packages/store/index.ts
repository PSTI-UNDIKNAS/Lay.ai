import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, AuthActions, LoginRequest, User } from '@layai/types';
import { tokenStorage, createAuthHeaders, handleApiError, getApiUrl, ApiError } from '@layai/utils';

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true });
          
          const response = await fetch(`${getApiUrl()}/auth/login`, {
            method: 'POST',
            headers: createAuthHeaders(),
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
          }

          const data = await response.json();
          const { token, user } = data;

          // Store token
          tokenStorage.set(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          const apiError = handleApiError(error);
          throw new Error(apiError.message);
        }
      },

      logout: () => {
        tokenStorage.remove();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      checkAuth: () => {
        const token = tokenStorage.get();
        if (token) {
          // In a real app, you might want to validate the token with the server
          // For now, we'll just check if it exists
          const currentState = get();
          if (!currentState.isAuthenticated) {
            set({
              token,
              isAuthenticated: true,
            });
          }
        } else {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
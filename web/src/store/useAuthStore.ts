import { create } from "zustand";

interface AuthState {
    address: string | null;
    signature: string | null;
    isAuthenticated: boolean;
    setAuth: (address: string, signature: string) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    address: null,
    signature: null,
    isAuthenticated: false,
    setAuth: (address, signature) =>
        set({ address, signature, isAuthenticated: true }),
    clearAuth: () => set({ address: null, signature: null, isAuthenticated: false }),
}));

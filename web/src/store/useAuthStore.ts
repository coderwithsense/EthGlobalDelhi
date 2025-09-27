import { create } from "zustand";

// --- Zustand Store for Authentication ---
// This store will manage the user's authentication state across the app.
interface AuthState {
    address: string | null;
    isAuthenticated: boolean;
    signature: string | null;
    setAuth: (address: string, signature: string) => void;
    clearAuth: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
    address: null,
    signature: null,
    isAuthenticated: false,
    setAuth: (address, signature) =>
        set({ address, signature, isAuthenticated: true }),
    clearAuth: () =>
        set({ address: null, signature: null, isAuthenticated: false }),
}));

export default useAuthStore;
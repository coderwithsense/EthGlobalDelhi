import { create } from "zustand";

// --- Zustand Store for Authentication ---
// This store will manage the user's authentication state across the app.
interface AuthState {
    address: string | null;
    isAuthenticated: boolean;
    signature: string | null;
    setAuth: (address: string, signature: string) => void;
    clearAuth: () => void;
    rehydrate: () => void; // Added to match the store implementation
}

const useAuthStore = create<AuthState>((set) => ({
    address: null,
    signature: null,
    isAuthenticated: false,
    setAuth: (address, signature) =>
        set({ address, signature, isAuthenticated: true }),
    clearAuth: () =>
        set({ address: null, signature: null, isAuthenticated: false }),
    rehydrate: () => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed.address && parsed.signature) {
                set({
                    address: parsed.address,
                    signature: parsed.signature,
                    isAuthenticated: true,
                });
            }
        }
    },
}));


export default useAuthStore;
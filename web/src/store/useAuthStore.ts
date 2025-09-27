import { create } from "zustand";

// --- Zustand Store for Authentication ---
// This store will manage the user's authentication state across the app.
interface AuthState {
    address: string | null;
    isAuthenticated: boolean;
    secret: bigint | null;
    setAuth: (address: string, secret: bigint) => void;
    clearAuth: () => void;
    rehydrate: () => void; // Added to match the store implementation
}

const useAuthStore = create<AuthState>((set) => ({
    address: null,
    secret: null,
    isAuthenticated: false,
    setAuth: (address, secret) =>
        set({ address, secret, isAuthenticated: true }),
    clearAuth: () =>
        set({ address: null, secret: null, isAuthenticated: false }),
    rehydrate: () => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed.address && parsed.secret) {
                set({
                    address: parsed.address,
                    secret: BigInt(parsed.secret),
                    isAuthenticated: true,
                });
            }
        }
    },
}));


export default useAuthStore;
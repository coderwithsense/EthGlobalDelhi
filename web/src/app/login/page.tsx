"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { signInWithNfc } from "@/lib/nfcTx/nfcService";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleNFCLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      // 👉 Use your NFC signing flow
      const { address, signature } = await signInWithNfc();

      // Save in Zustand Auth store
      setAuth(address, signature);

      // Optional: persist to localStorage (if you want session survive reloads)
      localStorage.setItem("authenticated", "true");
      localStorage.setItem("user", JSON.stringify({ address, signature }));

      // Redirect
      router.push("/dashboard");
    } catch (err: any) {
      console.error("NFC Login Error:", err);
      setError(err.message || "NFC authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700">
          {/* Logo/Icon */}
          <div className="text-center mb-8">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl transform rotate-6"></div>
              <div className="relative bg-gray-700 rounded-2xl w-full h-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.465 11.293c1.133-1.133 3.109-1.133 4.242 0l.707.707 1.414-1.414-.707-.707c-.943-.944-2.199-1.465-3.535-1.465s-2.592.521-3.535 1.465L4.929 12a5.008 5.008 0 0 0 0 7.071 4.983 4.983 0 0 0 3.535 1.462A4.982 4.982 0 0 0 12 19.071l.707-.707-1.414-1.414-.707.707a3.007 3.007 0 0 1-4.243 0 3.005 3.005 0 0 1 0-4.243l2.122-2.121z" />
                  <path d="m12 4.929-.707.707 1.414 1.414.707-.707a3.007 3.007 0 0 1 4.243 0 3.005 3.005 0 0 1 0 4.243l-2.122 2.121c-1.133 1.133-3.109 1.133-4.242 0L10.586 12l-1.414 1.414.707.707c.943.944 2.199 1.465 3.535 1.465s2.592-.521 3.535-1.465L19.071 12a5.008 5.008 0 0 0 0-7.071A5.006 5.006 0 0 0 12 4.929z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome</h1>
            <p className="text-gray-400">Secure NFC Authentication</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* NFC Login Button */}
          <button
            onClick={handleNFCLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Authenticating NFC...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-3">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4V4h4v16zm6-2.5c0-1.38-1.12-2.5-2.5-2.5S9 16.12 9 17.5 10.12 20 11.5 20s2.5-1.12 2.5-2.5zM20 20h-6v-2.5c0-2.48-2.02-4.5-4.5-4.5S5 15.02 5 17.5V20H4V4h16v16z" />
                </svg>
                <span>Login with NFC</span>
              </div>
            )}
          </button>

          {/* Instructions */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Tap your NFC card to authenticate
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            Secure • Blockchain-based • Decentralized
          </p>
        </div>
      </div>
    </div>
  );
}

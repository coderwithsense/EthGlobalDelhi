"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { signInWithNfc } from "@/lib/nfcTx/nfcService";
import { userExists } from "@/lib/registry";
import { CreditCard } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleNFCLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      setLoadingMessage("Authenticating with NFC...");
      const { address, secret, secretHash } = await signInWithNfc();
      setAuth(address, secret);

      setLoadingMessage("Checking user registration...");
      const exists = await userExists(secretHash);

      if (exists) {
        setLoadingMessage("Login successful!");
        router.push("/dashboard");
      } else {
        localStorage.setItem("pendingUserId", address);
        localStorage.setItem("pendingSecret", secret.toString());
        setLoadingMessage("Registration required...");
        router.push("/register");
      }
    } catch (err: any) {
      console.error("NFC Login Error:", err);
      setError(err?.message || "Authentication failed");
      localStorage.clear();
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 text-center">
          {/* App Branding */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-black text-white mb-3 shadow-md">
              {/* <CreditCard className="w-7 h-7" /> */}
              <Image
                src="/logo.png"
                alt="NFC Icon"
                width={100}
                height={100}
                className="border rounded-full"
              />
            </div>
            <h1 className="text-2xl font-bold text-black">AccessFi</h1>
            <p className="text-gray-600 text-sm mt-1">
              Welcome – Secure NFC Authentication
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleNFCLogin}
            disabled={isLoading}
            className="w-full bg-black text-white font-medium py-3 px-6 rounded-xl shadow-md hover:bg-gray-900 transition-all"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>{loadingMessage || "Processing..."}</span>
              </div>
            ) : (
              "Login with NFC"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

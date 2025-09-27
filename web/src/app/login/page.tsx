"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { signInWithNfc } from "@/lib/nfcTx/nfcService";
import { ethers } from "ethers";
import { userExists } from "@/lib/registry";

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
      // Step 1: NFC Authentication
      setLoadingMessage("Authenticating with NFC...");
      const { address, signature } = await signInWithNfc();
      setAuth(address, signature);

      // Step 2: Compute secret hash from signature
      setLoadingMessage("Checking user registration...");
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes(address));
      alert(signature);
      console.log("SecretHash:", secretHash);

      // Step 3: Query registry
      const exists = await userExists(secretHash);
      console.log("User exists?", exists);

      if (exists) {
        setLoadingMessage("Login successful!");
        router.push("/dashboard");
      } else {
        console.log("User not found → redirect to register");
        localStorage.setItem("pendingUserId", address);
        localStorage.setItem("pendingUserSignature", secretHash);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome</h1>
            <p className="text-gray-400">Secure NFC Authentication</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleNFCLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-3">
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

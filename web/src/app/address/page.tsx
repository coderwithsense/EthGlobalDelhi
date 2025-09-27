"use client";

import { useState } from "react";
import { getCardAddress } from "@/lib/nfcTx/nfcService";

export default function NFCAddressPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetAddress = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const addr = await getCardAddress();
      setAddress(addr);
    } catch (err: any) {
      setError(err.message || "Failed to fetch NFC address");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">NFC Card Address</h1>

        {address ? (
          <p className="text-green-400 break-words">{address}</p>
        ) : (
          <p className="text-gray-400 mb-4">
            Tap your NFC card to fetch its Ethereum address
          </p>
        )}

        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

        <button
          onClick={handleGetAddress}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg"
        >
          {isLoading ? "Reading NFC..." : "Get NFC Address"}
        </button>
      </div>
    </div>
  );
}

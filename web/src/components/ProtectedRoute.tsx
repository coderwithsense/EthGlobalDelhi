// components/ProtectedRoute.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, address, signature } = useAuthStore();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Run only in client
    if (typeof window === "undefined") return;

    const checkAuth = async () => {
      try {
        if (!isAuthenticated || !address || !signature) {
          router.replace("/login");
          return;
        }

        // Optional: verify with backend
        const res = await fetch("/api/user", {
          headers: { "wallet-address": address, "wallet-signature": signature },
        });

        if (!res.ok) {
          router.replace("/login");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/login");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [isAuthenticated, address, signature, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect in progress
  }

  return <>{children}</>;
}

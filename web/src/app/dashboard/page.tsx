"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import useAuthStore from "@/store/useAuthStore";
import { getUserInfo } from "@/lib/registry";
import { ethers } from "ethers";
import { userInfo } from "os";
import { uint256ToString } from "@/lib/utils";

interface User {
  userId: string;
  name: string;
  dateOfBirth: number;
  gender: number;
  city: string;
  country: string;
  imageUrl?: string;
}

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const router = useRouter();

  const { address, signature, clearAuth } = useAuthStore();

  useEffect(() => {
    const secretHash = ethers.keccak256(ethers.toUtf8Bytes(signature!));
    getUserInfo(secretHash).then((userData) => {
      console.log('User data', userData);
      const parsedUser =  {
        userId: address,
        name: uint256ToString(userData.encryptedFields[0]),
        dateOfBirth: Number(userData.encryptedFields[1]),
        gender: Number(userData.encryptedFields[2]),
        city: uint256ToString(userData.encryptedFields[3]),
        country: uint256ToString(userData.encryptedFields[4]),
        imageUrl: uint256ToString(userData.encryptedFields[5]),
      } as User;
      if( parsedUser.imageUrl?.length == 0 ) {
        parsedUser.imageUrl = undefined;
      }
      setUser(parsedUser as User);
    });    
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    localStorage.removeItem("user");
    clearAuth(); // ✅ Clear Zustand auth state
    router.push("/login");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Welcome back, {user.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl transition-colors duration-200"
          >
            Logout
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32">
                {userImage ? (
                  <img
                    src={userImage}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-2xl border-4 border-blue-500/30"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                )}
                {/* Status indicator */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-800 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-grow">
              <h2 className="text-2xl font-bold text-white mb-4">
                {user.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Date of Birth
                  </h3>
                  <p className="text-white">{formatDate(user.dateOfBirth)}</p>
                </div>

                <div className="bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Gender
                  </h3>
                  <p className="text-white">
                    {user.gender === 0 ? "Male" : "Female"}
                  </p>
                </div>

                <div className="bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Location
                  </h3>
                  <p className="text-white">
                    {user.city}, {user.country}
                  </p>
                </div>

                <div className="bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    User ID
                  </h3>
                  <p className="text-white font-mono text-sm">{user.userId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other sections unchanged... */}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

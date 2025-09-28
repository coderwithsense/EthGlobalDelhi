"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import useAuthStore from "@/store/useAuthStore";
import {
  getUserInfo,
  getEvents,
  decryptFields,
  checkIfNullifierExists,
} from "@/lib/registry";
import { uint256ToString } from "@/lib/utils";
import { poseidon } from "@iden3/js-crypto";
import QRCode from "qrcode";

interface User {
  userId: string;
  name: string;
  dateOfBirth: number;
  gender: number;
  city: string;
  country: string;
  imageUrl?: string;
}

interface EventInfo {
  criteriaFieldIndex: bigint;
  criteriaOp: number;
  criteriaValue: bigint;
  eventName: string;
  eventInfoJson: string;
}

interface ParsedEventInfo {
  loc: string;
  desc: string;
  url: string;
}

interface Event {
  organizer: string;
  info: EventInfo;
  eventAddress: string;
  parsedInfo: ParsedEventInfo;
  isRegistered?: boolean;
  checkingRegistration?: boolean;
}

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  userName: string;
  qrValue: string;
}

function QRModal({
  isOpen,
  onClose,
  eventName,
  userName,
  qrValue,
}: QRModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(true);

  useEffect(() => {
    if (isOpen && qrValue) {
      generateQRCode();
    }
  }, [isOpen, qrValue]);

  const generateQRCode = async () => {
    try {
      setQrLoading(true);
      const url = await QRCode.toDataURL(qrValue, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    } finally {
      setQrLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-3xl p-8 max-w-md w-full border border-gray-700">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Event Entry QR</h3>
          <p className="text-gray-400 mb-2">{eventName}</p>
          <p className="text-blue-400 font-medium mb-6">{userName}</p>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl mb-6 inline-block">
            {qrLoading ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-400 border-t-transparent"></div>
              </div>
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Failed to generate QR</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-6 font-mono break-all">
            QR Data: {qrValue.substring(0, 16)}...
          </p>

          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    eventName: string;
    qrValue: string;
  }>({
    isOpen: false,
    eventName: "",
    qrValue: "",
  });
  const router = useRouter();

  const { address, secret, clearAuth } = useAuthStore();

  // Generate random 32 bytes for QR code (demo purposes)
  const generateRandomQRValue = (): string => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const checkRegistrationStatus = async (
    eventAddress: string
  ): Promise<boolean> => {
    try {
      if (!secret) return false;
      return await checkIfNullifierExists(eventAddress, secret);
    } catch (error) {
      console.error(`Error checking registration for ${eventAddress}:`, error);
      return false;
    }
  };

  useEffect(() => {
    const secretHash = poseidon.hash([secret!]);
    //const secretHash = ethers.keccak256(ethers.toUtf8Bytes(signature!));

    // Load user info
    getUserInfo(secretHash).then((userData) => {
      console.warn("Dashboard, secret is", secret);
      console.log("User data", userData);
      console.log("Encrypted Fields", userData.encryptedFields);
      const decryptedFields = decryptFields(secret!, userData.encryptedFields);
      console.log("Decrypted user data", decryptedFields);
      const parsedUser = {
        userId: address,
        name: uint256ToString(decryptedFields[0]),
        dateOfBirth: Number(decryptedFields[1]),
        gender: Number(decryptedFields[2]),
        city: uint256ToString(decryptedFields[3]),
        country: uint256ToString(decryptedFields[4]),
        imageUrl: uint256ToString(decryptedFields[5]),
      } as User;
      if (parsedUser.imageUrl?.length == 0) {
        parsedUser.imageUrl = undefined;
      }
      setUser(parsedUser as User);
      setUserImage(parsedUser.imageUrl || null);
    });

    // Load events
    getEvents()
      .then(async (eventsData) => {
        console.log("Events data", eventsData);

        // Access the named properties from the ethers struct result
        const organizers = eventsData.organizers;
        const infos = eventsData.infos;
        const eventAddresses = eventsData.eventAddresses;

        // Validate that all arrays exist and have the same length
        if (!organizers || !infos || !eventAddresses) {
          console.warn("Missing event data arrays:", {
            organizers,
            infos,
            eventAddresses,
          });
          setEventsLoading(false);
          return;
        }

        if (
          !Array.isArray(organizers) ||
          !Array.isArray(infos) ||
          !Array.isArray(eventAddresses)
        ) {
          console.warn("Event data is not arrays:", {
            organizers,
            infos,
            eventAddresses,
          });
          setEventsLoading(false);
          return;
        }

        if (
          organizers.length !== infos.length ||
          organizers.length !== eventAddresses.length
        ) {
          console.warn("Event arrays have mismatched lengths:", {
            organizers: organizers.length,
            infos: infos.length,
            eventAddresses: eventAddresses.length,
          });
          setEventsLoading(false);
          return;
        }

        const parsedEvents: Event[] = organizers.map(
          (organizer: string, index: number) => {
            const info = infos[index];
            let parsedInfo: ParsedEventInfo = { loc: "", desc: "", url: "" };

            try {
              if (info && info.eventInfoJson) {
                parsedInfo = JSON.parse(info.eventInfoJson);
              }
            } catch (error) {
              console.error("Error parsing event info JSON:", error);
            }

            return {
              organizer,
              info,
              eventAddress: eventAddresses[index],
              parsedInfo,
              checkingRegistration: true,
              isRegistered: false,
            };
          }
        );

        setEvents(parsedEvents);

        // Check registration status for each event
        const updatedEvents = await Promise.all(
          parsedEvents.map(async (event) => {
            const isRegistered = await checkRegistrationStatus(
              event.eventAddress
            );
            return {
              ...event,
              isRegistered,
              checkingRegistration: false,
            };
          })
        );

        setEvents(updatedEvents);
        setEventsLoading(false);
      })
      .catch((error) => {
        console.error("Error loading events:", error);
        setEventsLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    localStorage.removeItem("user");
    clearAuth(); // ✅ Clear Zustand auth state
    router.push("/login");
  };

  const handleShowQR = (eventName: string) => {
    const qrValue = generateRandomQRValue();
    setQrModal({
      isOpen: true,
      eventName,
      qrValue,
    });
  };

  const closeQRModal = () => {
    setQrModal({
      isOpen: false,
      eventName: "",
      qrValue: "",
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const isEligibleForEvent = (event: Event): boolean => {
    if (!user) return false;

    // Check criteria based on criteriaFieldIndex
    // 0 = age, 1 = dateOfBirth, 2 = gender, etc.
    const criteriaFieldIndex = Number(event.info.criteriaFieldIndex);
    const criteriaOp = Number(event.info.criteriaOp); // Convert BigInt to Number
    const criteriaValue = Number(event.info.criteriaValue);

    let userValue: number;

    switch (criteriaFieldIndex) {
      case 0: // Age check
        const age = Math.floor(
          (Date.now() - user.dateOfBirth * 1000) /
            (365.25 * 24 * 60 * 60 * 1000)
        );
        userValue = age;
        console.log(
          `Age check: user age ${age} vs criteria ${criteriaValue}, op ${criteriaOp} (type: ${typeof criteriaOp})`
        );
        break;
      case 1: // Date of birth
        userValue = user.dateOfBirth;
        break;
      case 2: // Gender
        userValue = user.gender;
        break;
      default:
        return false;
    }

    // Check criteria operation
    // Based on your events: 0,0,18 (field 0, op 0, value 18), 0,1,18 (field 0, op 1, value 18), 0,2,25 (field 0, op 2, value 25)
    // It looks like: 0 = equal, 1 = greater than or equal, 2 = less than or equal
    let result: boolean;
    switch (criteriaOp) {
      case 0:
        result = userValue === criteriaValue;
        break;
      case 1:
        result = userValue >= criteriaValue;
        break;
      case 2:
        result = userValue <= criteriaValue;
        break;
      default:
        result = false;
    }

    console.log(
      `Eligibility result: ${result} (${userValue} ${
        criteriaOp === 0 ? "===" : criteriaOp === 1 ? ">=" : "<="
      } ${criteriaValue})`
    );
    return result;
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
                  <p className="text-white">
                    {formatDate(user.dateOfBirth)}
                    <span className="text-gray-400 text-sm ml-2">
                      (Age:{" "}
                      {Math.floor(
                        (Date.now() - user.dateOfBirth * 1000) /
                          (365.25 * 24 * 60 * 60 * 1000)
                      )}
                      )
                    </span>
                  </p>
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

        {/* Events Section */}
        <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Available Events</h2>
            {eventsLoading && (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            )}
          </div>

          {eventsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-4xl mb-4">🎉</div>
              <p className="text-gray-400">No events available at the moment</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {events.map((event, index) => {
                const isEligible = isEligibleForEvent(event);
                const isRegistered = event.isRegistered || false;
                const checkingRegistration =
                  event.checkingRegistration || false;

                return (
                  <div
                    key={index}
                    className={`p-6 rounded-2xl border transition-all duration-200 ${
                      isEligible
                        ? isRegistered
                          ? "bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30"
                          : "bg-green-900/20 border-green-500/30 hover:bg-green-900/30"
                        : "bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50 opacity-60"
                    }`}
                  >
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">
                          {event.info.eventName}
                        </h3>
                        {isEligible && (
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              isRegistered
                                ? "bg-purple-500 text-purple-100"
                                : "bg-green-500 text-green-100"
                            }`}
                          >
                            {isRegistered ? "Registered" : "Eligible"}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-300 mb-3">
                        {event.parsedInfo.desc}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm mb-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{event.parsedInfo.loc}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-400">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                          </svg>
                          <span className="font-mono text-xs">
                            {event.organizer.slice(0, 6)}...
                            {event.organizer.slice(-4)}
                          </span>
                        </div>
                      </div>

                      {event.parsedInfo.url && (
                        <div className="flex items-center gap-2 text-sm text-blue-400">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <a
                            href={event.parsedInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-300 transition-colors duration-200 underline"
                          >
                            {event.parsedInfo.url}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-600/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isEligible ? (
                            <svg
                              className="w-4 h-4 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4 text-red-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <p className="text-xs text-gray-500">
                            Criteria:{" "}
                            {event.info.criteriaFieldIndex.toString() === "0"
                              ? "Age"
                              : "Field " +
                                event.info.criteriaFieldIndex.toString()}
                            {Number(event.info.criteriaOp) === 1
                              ? " ≥ "
                              : Number(event.info.criteriaOp) === 2
                              ? " ≤ "
                              : " = "}
                            {event.info.criteriaValue.toString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {isEligible && (
                      <div className="mt-4">
                        {checkingRegistration ? (
                          <div className="w-full bg-gray-600 text-white py-3 px-6 rounded-xl flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Checking registration...
                          </div>
                        ) : isRegistered ? (
                          <button
                            onClick={() => handleShowQR(event.info.eventName)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl transition-colors duration-200 font-medium"
                          >
                            Show QR Code
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              // Navigate to event registration page with event data
                              router.push(
                                `/eventreg?eventAddress=${
                                  event.eventAddress
                                }&eventName=${encodeURIComponent(
                                  event.info.eventName
                                )}`
                              );
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl transition-colors duration-200 font-medium"
                          >
                            Register for Event
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      <QRModal
        isOpen={qrModal.isOpen}
        onClose={closeQRModal}
        eventName={qrModal.eventName}
        userName={user.name}
        qrValue={qrModal.qrValue}
      />
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

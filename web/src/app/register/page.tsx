"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import {
  getCardAddress,
  signAndSendTransaction,
  prepareTransaction,
} from "@/lib/nfcTx/nfcService";
import { prepareRegisterPayload } from "@/lib/registry";
import { stringToUint256 } from "@/lib/utils";

interface FormData {
  name: string;
  dateOfBirth: string;
  gender: number;
  city: string;
  country: string;
  selfie: File | null;
}

interface EncryptedFields {
  name: bigint;
  dateOfBirth: bigint;
  gender: bigint;
  city: bigint;
  country: bigint;
  imageUrl: bigint;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    dateOfBirth: "",
    gender: 0,
    city: "",
    country: "",
    selfie: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [nfcAddress, setNfcAddress] = useState<string>("");
  const [registrationStep, setRegistrationStep] = useState<
    | "form"
    | "nfc"
    | "blockchain"
    | "uploading"
    | "preparing"
    | "signing"
    | "complete"
  >("form");
  const [currentStepMessage, setCurrentStepMessage] = useState<string>("");
  const [encryptedFieldsData, setEncryptedFieldsData] =
    useState<EncryptedFields | null>(null);
  const [transactionHash, setTransactionHash] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "gender" ? parseInt(value) : value,
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, selfie: file }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const connectNFC = async () => {
    try {
      setIsLoading(true);
      setError("");
      setRegistrationStep("nfc");
      setCurrentStepMessage("Tap your NFC card on the device...");

      // Get NFC card address
      const address = await getCardAddress();
      setNfcAddress(address);
      setCurrentStepMessage(`✓ NFC card connected successfully!`);

      console.log("NFC Card connected. Address:", address);

      // Brief pause to show success message
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return address;
    } catch (err: any) {
      console.error("NFC connection error:", err);
      setError(err.message || "Failed to connect to NFC card");
      setRegistrationStep("form");
      setCurrentStepMessage("");
      throw err;
    }
  };

  const prepareEncryptedFields = (imageUrl: string = ""): EncryptedFields => {
    try {
      setCurrentStepMessage("Encrypting user data for blockchain...");

      // Convert form data to encrypted fields (uint256 format)
      const dateTimestamp = Math.floor(
        new Date(formData.dateOfBirth).getTime() / 1000
      );

      const encryptedFields: EncryptedFields = {
        name: stringToUint256(formData.name),
        dateOfBirth: BigInt(dateTimestamp),
        gender: BigInt(formData.gender),
        city: stringToUint256(formData.city),
        country: stringToUint256(formData.country),
        imageUrl: stringToUint256(imageUrl),
      };

      console.log("Prepared encrypted fields:", encryptedFields);
      setEncryptedFieldsData(encryptedFields);

      return encryptedFields;
    } catch (err: any) {
      console.error("Error preparing encrypted fields:", err);
      throw new Error("Failed to prepare registration data");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Get pending user ID from localStorage (set during NFC scan)
      const pendingId = localStorage.getItem("pendingUserId");
      if (!pendingId) {
        setError("No pending user ID found. Please scan your NFC card first.");
        return;
      }
      setUserId(pendingId);

      // Step 1: Connect NFC card
      setCurrentStepMessage("Connecting to NFC card...");
      const cardAddress = await connectNFC();

      // Step 2: Upload selfie if provided
      let imageUrl = "";
      if (formData.selfie) {
        setRegistrationStep("uploading");
        setCurrentStepMessage("Uploading your selfie...");

        const imageFormData = new FormData();
        imageFormData.append("image", formData.selfie);
        imageFormData.append("userId", pendingId);

        const imageResponse = await fetch("/api/user/image", {
          method: "POST",
          body: imageFormData,
        });

        if (!imageResponse.ok) {
          throw new Error("Failed to upload image");
        }

        const imageResult = await imageResponse.json();
        imageUrl = imageResult.url;
        setCurrentStepMessage("✓ Selfie uploaded successfully!");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Step 3: Prepare blockchain transaction
      setRegistrationStep("preparing");
      setCurrentStepMessage("Preparing blockchain transaction...");

      // Create secret hash using user ID and card address
      const secretData = `${pendingId}-${cardAddress}`;
      const secretHash = ethers.keccak256(ethers.toUtf8Bytes(secretData));

      // Prepare encrypted fields
      const encryptedFields = prepareEncryptedFields(imageUrl);

      // Convert to array format for contract
      const fieldsArray = [
        encryptedFields.name,
        encryptedFields.dateOfBirth,
        encryptedFields.gender,
        encryptedFields.city,
        encryptedFields.country,
        encryptedFields.imageUrl,
      ];

      // Prepare registry transaction payload
      const registryPayload = await prepareRegisterPayload(
        secretHash,
        fieldsArray
      );
      setCurrentStepMessage("✓ Transaction prepared!");

      console.log("Registry payload prepared:", registryPayload);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 4: Sign and send blockchain transaction
      setRegistrationStep("signing");
      setCurrentStepMessage(
        "Please tap your NFC card to sign the transaction..."
      );

      // First, prepare a basic transaction for NFC signing
      const basicTx = await prepareTransaction(cardAddress);

      // Modify the transaction to call the registry contract
      const finalTx = {
        ...basicTx,
        to: registryPayload.to,
        data: registryPayload.data,
        value: 0, // No ETH transfer for registration
        gasLimit: 300000, // Increase gas limit for contract interaction
      };

      console.log("Sending blockchain transaction...");
      setCurrentStepMessage("Signing transaction with NFC card...");
      const txResponse = await signAndSendTransaction(finalTx, cardAddress);

      setTransactionHash(txResponse.hash);
      setCurrentStepMessage("✓ Transaction signed successfully!");

      console.log("Blockchain transaction completed:", txResponse.hash);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 5: Complete registration
      setRegistrationStep("complete");
      setCurrentStepMessage(
        "Registration completed successfully! Redirecting..."
      );

      // Save user data locally (optional - for UI purposes)
      const userData = {
        userId: pendingId,
        address: cardAddress,
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        city: formData.city,
        country: formData.country,
        imageUrl,
        txHash: txResponse.hash,
        secretHash,
        encryptedFields: encryptedFields,
      };

      // Store user session
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("authenticated", "true");
      localStorage.removeItem("pendingUserId");

      await new Promise((resolve) => setTimeout(resolve, 2000));
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed");
      setRegistrationStep("form");
      setCurrentStepMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const getStepText = () => {
    switch (registrationStep) {
      case "nfc":
        return "Connecting to NFC";
      case "uploading":
        return "Uploading Image";
      case "preparing":
        return "Preparing Transaction";
      case "signing":
        return "Signing Transaction";
      case "complete":
        return "Registration Complete";
      default:
        return "Complete Registration";
    }
  };

  const getStepDescription = () => {
    if (currentStepMessage) {
      return currentStepMessage;
    }

    switch (registrationStep) {
      case "nfc":
        return "Please tap your NFC card to the device";
      case "uploading":
        return "Uploading your selfie to secure storage";
      case "preparing":
        return "Encrypting your data for blockchain storage";
      case "signing":
        return "Use your NFC card to sign the blockchain transaction";
      case "complete":
        return "Your profile has been created successfully";
      default:
        return "Create your blockchain profile";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {getStepText()}
          </h1>
          <p className="text-gray-400">{getStepDescription()}</p>
          {nfcAddress && (
            <div className="text-sm text-blue-400 mt-2">
              <p>
                NFC Address: {nfcAddress.slice(0, 6)}...{nfcAddress.slice(-4)}
              </p>
            </div>
          )}
          {transactionHash && (
            <div className="text-sm text-green-400 mt-2">
              <p>
                Transaction: {transactionHash.slice(0, 6)}...
                {transactionHash.slice(-4)}
              </p>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  registrationStep === "form"
                    ? "bg-blue-500"
                    : [
                        "nfc",
                        "uploading",
                        "preparing",
                        "signing",
                        "complete",
                      ].includes(registrationStep)
                    ? "bg-green-500"
                    : "bg-gray-600"
                }`}
              >
                {[
                  "nfc",
                  "uploading",
                  "preparing",
                  "signing",
                  "complete",
                ].includes(registrationStep) ? (
                  <span className="text-white text-sm">✓</span>
                ) : (
                  <span className="text-white text-sm font-bold">1</span>
                )}
              </div>
              <div
                className={`flex-1 h-1 mx-2 ${
                  ["uploading", "preparing", "signing", "complete"].includes(
                    registrationStep
                  )
                    ? "bg-green-500"
                    : registrationStep === "nfc"
                    ? "bg-blue-500"
                    : "bg-gray-600"
                }`}
              ></div>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  registrationStep === "nfc"
                    ? "bg-blue-500"
                    : registrationStep === "uploading"
                    ? "bg-blue-500"
                    : ["preparing", "signing", "complete"].includes(
                        registrationStep
                      )
                    ? "bg-green-500"
                    : "bg-gray-600"
                }`}
              >
                {["preparing", "signing", "complete"].includes(
                  registrationStep
                ) ? (
                  <span className="text-white text-sm">✓</span>
                ) : (
                  <span className="text-white text-sm font-bold">2</span>
                )}
              </div>
              <div
                className={`flex-1 h-1 mx-2 ${
                  ["signing", "complete"].includes(registrationStep)
                    ? "bg-green-500"
                    : registrationStep === "preparing"
                    ? "bg-blue-500"
                    : "bg-gray-600"
                }`}
              ></div>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  registrationStep === "preparing"
                    ? "bg-blue-500"
                    : registrationStep === "signing"
                    ? "bg-blue-500"
                    : registrationStep === "complete"
                    ? "bg-green-500"
                    : "bg-gray-600"
                }`}
              >
                {registrationStep === "complete" ? (
                  <span className="text-white text-sm">✓</span>
                ) : (
                  <span className="text-white text-sm font-bold">3</span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Form Data</span>
              <span>NFC & Upload</span>
              <span>Blockchain</span>
            </div>
          </div>

          {/* Current Step Information */}
          {isLoading && (
            <div className="mb-6 p-4 bg-blue-900/50 border border-blue-700 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
                <div>
                  <p className="text-blue-300 font-medium">{getStepText()}</p>
                  <p className="text-blue-200 text-sm">
                    {getStepDescription()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Encrypted Fields Preview (show when data is prepared) */}
          {encryptedFieldsData && !isLoading && (
            <div className="mb-6 p-4 bg-gray-700/50 border border-gray-600 rounded-xl">
              <h3 className="text-white font-medium mb-3">
                Encrypted Data Preview
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-mono">
                    {encryptedFieldsData.name.toString().slice(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date of Birth:</span>
                  <span className="text-white font-mono">
                    {encryptedFieldsData.dateOfBirth.toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gender:</span>
                  <span className="text-white font-mono">
                    {encryptedFieldsData.gender.toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">City:</span>
                  <span className="text-white font-mono">
                    {encryptedFieldsData.city.toString().slice(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Country:</span>
                  <span className="text-white font-mono">
                    {encryptedFieldsData.country.toString().slice(0, 20)}...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Selfie Upload Section */}
          <div className="mb-8 text-center">
            <div className="relative mx-auto w-32 h-32 mb-4">
              <div className="w-full h-full rounded-2xl bg-gray-700 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="text-center">
                    <svg
                      className="w-8 h-8 text-gray-400 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <p className="text-xs text-gray-400">Selfie</p>
                  </div>
                )}
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-1 -right-1 w-6 h-6">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-3.01L12 0z" />
                </svg>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-6 py-2 rounded-xl transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {imagePreview ? "Change Photo" : "Add Selfie (Optional)"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Full Name"
                required
                disabled={isLoading}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {/* Gender */}
            <div>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value={0}>Male</option>
                <option value={1}>Female</option>
              </select>
            </div>

            {/* City */}
            <div>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City"
                required
                disabled={isLoading}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {/* Country */}
            <div>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="Country"
                required
                disabled={isLoading}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>{getStepText()}</span>
                </div>
              ) : (
                "Complete Registration"
              )}
            </button>
          </form>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/login")}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:text-gray-600"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ethers, JsonRpcProvider, toBigInt } from "ethers";
import ProtectedRoute from "../../components/ProtectedRoute";
import useAuthStore from "@/store/useAuthStore";
import { getEvent, getUserInfo, getTreeProof } from "@/lib/registry";
import {
  getCardAddress,
  signAndSendTransaction,
  prepareTransaction,
} from "@/lib/nfcTx/nfcService";
import { RPC_URL } from "@/lib/nfcTx/config";
import { poseidon } from "@iden3/js-crypto";

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

interface EventData {
  organizer: string;
  info: EventInfo;
  parsedInfo: ParsedEventInfo;
}

interface ProofResult {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
}

function EventRegistrationContent() {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrationStep, setRegistrationStep] = useState<
    | "loading"
    | "ready"
    | "generating_proof"
    | "nfc"
    | "signing"
    | "complete"
  >("loading");
  const [currentStepMessage, setCurrentStepMessage] = useState("");
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, secret } = useAuthStore();

  const eventAddress = searchParams.get("eventAddress");
  const eventName = searchParams.get("eventName");

  useEffect(() => {
    if (!eventAddress) {
      setError("No event address provided");
      setLoading(false);
      return;
    }

    loadEventData();
  }, [eventAddress]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setCurrentStepMessage("Loading event details...");

      const eventData = await getEvent(eventAddress!);
      const [organizer, info] = eventData;

      let parsedInfo: ParsedEventInfo = { loc: "", desc: "", url: "" };
      try {
        if (info.eventInfoJson) {
          parsedInfo = JSON.parse(info.eventInfoJson);
        }
      } catch (e) {
        console.error("Error parsing event info JSON:", e);
      }

      setEvent({
        organizer,
        info,
        parsedInfo,
      });

      setRegistrationStep("ready");
      setCurrentStepMessage("");
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading event data:", err);
      setError(err.message || "Failed to load event data");
      setLoading(false);
    }
  };

  const generateProof = async () => {
    try {
      setCurrentStepMessage("Fetching user data from blockchain...");

      // Get secret hash from auth store
      const secretHash = poseidon.hash([secret!]);
      //const secretHash = ethers.keccak256(ethers.toUtf8Bytes(signature!));
      
      // Get user info from contract
      const userInfo = await getUserInfo(secretHash);
      console.log('User info from contract:', userInfo);
      
      if (!userInfo.exists) {
        throw new Error("User not found in registry");
      }
      
      setCurrentStepMessage("Fetching merkle proof...");
      
      // Get merkle proof using user's tree index
      const proofData = await getTreeProof(userInfo.treeIndex);
      console.log('Merkle proof data:', proofData);
      
      const [merkleRoot, treeProof] = proofData;
      
      setCurrentStepMessage("Initializing ZK proof generation...");
      
      // Wait a tick to ensure we're fully in browser
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (typeof window === 'undefined') {
        throw new Error("Must be in browser environment");
      }

      console.log('Initializing WASM for proof generation...');
      
      // Dynamic import the WASM module
      const wasmModule = await import('circuit-wasm-pom');
      
      // Initialize the WASM
      await wasmModule.default();
      
      console.log('WASM initialized, generating proof...');

      // Construct proof input based on your unit test example
      const proofInput = {
        contractAddr: toBigInt(eventAddress!).toString(),
        secret: secret!.toString(), // Remove 0x prefix for the circuit
        merkleRoot: merkleRoot.toString(),
        treeProof: treeProof.map((p: any) => p.toString()),
        treeIndex: userInfo.treeIndex.toString(),
        
        // Event criteria for the proof
        value: event!.info.criteriaValue.toString(),
        op: event!.info.criteriaOp.toString(),
        fieldIndex: event!.info.criteriaFieldIndex.toString(),
      };

      const proofInputJson = JSON.stringify(proofInput);

      console.log('Proof input:', proofInputJson);
      console.log('Example proof JSON', JSON.stringify({"contractAddr":"1233265966602387496986632306278180124584166694785","secret":"14369413238015302997079178310283984737590019955797903350591979266172570141616","merkleRoot":"17759693224622678927539726275112084543981008261912887971512942942753815534012","treeProof":["14985416932943426356763001424314173037535507728462281724568136836276837062074","19186237599312284487228067938250996138153965205584458105020193718525142281959","17299480785708190696366365493035422664147588505398827977484636802928901857005","21690097534500989957571259454590699782638688202958337039527330129236222322711","8747722700853757273888253410058171881718421224760285675761415788408845136791","2170340681969579960725290011193760005189447340623189440743009274314327794666","15770747660714906506802506904715831444690675075313855179602564224486744015016","17895431707094691284922758372232170710119016129431281964096302949644285356626","7374120080132106558265368605388014639918237714784396487219290499514416536621","17532627609469511848305180420091545486496218406290928847971392125790388997693"],"treeIndex":0,"value":"1","op":"2","fieldIndex":"0"}));
      
      setCurrentStepMessage("Generating zero-knowledge proof...");
      
      // Generate the proof
      const proofResultString = wasmModule.process_string(proofInputJson);
      const proof = JSON.parse(proofResultString) as ProofResult;
      
      setProofResult(proof);
      setCurrentStepMessage("✓ Proof generated successfully!");
      
      console.log('Proof generated:', proof);
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { proof, merkleRoot, userInfo };
    } catch (err: any) {
      console.error('Proof generation error:', err);
      throw new Error(`Failed to generate proof: ${err.message}`);
    }
  };

  const mintEventToken = async (proofData: { proof: ProofResult, merkleRoot: any, userInfo: any }) => {
    try {
      setCurrentStepMessage("Connecting to NFC card...");
      
      // Get NFC card address
      const cardAddress = await getCardAddress();
      setCurrentStepMessage("✓ NFC card connected!");

      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentStepMessage("Preparing mint transaction...");
      
      // Prepare the mint transaction
      const basicTx = await prepareTransaction(cardAddress);
      
      const provider = new JsonRpcProvider(RPC_URL);
      
      // Create contract interface for the mint function
      const eventContractABI = [
        "function mint((uint256[2] A, uint256[2][2] B, uint256[2] C) proof, uint256 merkleRoot, uint256 nullifier)"
      ];
      
      const eventContract = new ethers.Contract(eventAddress!, eventContractABI, provider);
      
      // Generate nullifier (you might want to use a specific method for this)
      // For now, using the user's leaf as nullifier
      const nullifier = proofData.userInfo.leaf;
      
      // Encode the mint function call
      const mintData = eventContract.interface.encodeFunctionData("mint", [
        {
          A: proofData.proof.a,
          B: proofData.proof.b, 
          C: proofData.proof.c
        },
        proofData.merkleRoot,
        nullifier
      ]);

      const finalTx = {
        ...basicTx,
        to: eventAddress,
        data: mintData,
        value: 0,
      };

      // Estimate gas
      finalTx.gasLimit = await provider.estimateGas(finalTx);

      setCurrentStepMessage("Please tap your NFC card to sign the transaction...");
      
      const txResponse = await signAndSendTransaction(finalTx, cardAddress);
      
      setTransactionHash(txResponse.hash);
      setCurrentStepMessage("✓ Registration completed successfully!");

      console.log("Event registration transaction:", txResponse.hash);
      
      return txResponse;
    } catch (err: any) {
      console.error('Mint transaction error:', err);
      throw new Error(`Failed to mint event token: ${err.message}`);
    }
  };

  const handleRegister = async () => {
    try {
      setIsRegistering(true);
      setError("");
      
      // Step 1: Generate proof
      setRegistrationStep("generating_proof");
      const proofData = await generateProof();
      
      // Step 2: Connect NFC and mint
      setRegistrationStep("nfc");
      await mintEventToken(proofData);
      
      // Step 3: Complete
      setRegistrationStep("complete");
      
      // Wait a bit then redirect
      await new Promise(resolve => setTimeout(resolve, 2000));
      router.push("/dashboard");
      
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed");
      setRegistrationStep("ready");
      setCurrentStepMessage("");
    } finally {
      setIsRegistering(false);
    }
  };

  const getStepIndicator = () => {
    const steps = [
      { key: "ready", label: "Ready", icon: "📝" },
      { key: "generating_proof", label: "Generating Proof", icon: "🔐" },
      { key: "nfc", label: "NFC Signing", icon: "📱" },
      { key: "complete", label: "Complete", icon: "✅" },
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const isActive = step.key === registrationStep;
          const isCompleted = steps.findIndex(s => s.key === registrationStep) > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                isActive 
                  ? 'bg-blue-600 text-white animate-pulse' 
                  : isCompleted 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-600 text-gray-300'
              }`}>
                {step.icon}
              </div>
              <span className={`ml-2 text-sm ${
                isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-600'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">{currentStepMessage || "Loading event..."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Register for Event</h1>
          <p className="text-gray-400">Complete your registration using zero-knowledge proof</p>
        </div>

        {/* Progress Steps */}
        {registrationStep !== "ready" && getStepIndicator()}

        {/* Event Details Card */}
        <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">{event?.info.eventName}</h2>
          <p className="text-gray-300 mb-4">{event?.parsedInfo.desc}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Location</h3>
              <p className="text-white">{event?.parsedInfo.loc}</p>
            </div>
            
            <div className="bg-gray-700/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Organizer</h3>
              <p className="text-white font-mono text-sm">
                {event?.organizer.slice(0, 6)}...{event?.organizer.slice(-4)}
              </p>
            </div>
          </div>

          {event?.parsedInfo.url && (
            <div className="mb-6">
              <a
                href={event.parsedInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline"
              >
                {event.parsedInfo.url}
              </a>
            </div>
          )}

          <div className="pt-4 border-t border-gray-600/30">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>
                Criteria: Age {Number(event?.info.criteriaOp) === 1 ? '≥' : Number(event?.info.criteriaOp) === 2 ? '≤' : '='} {event?.info.criteriaValue.toString()}
              </span>
            </div>
          </div>
        </div>

        {/* Current Step Message */}
        {currentStepMessage && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
            <p className="text-blue-300 text-center">{currentStepMessage}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-xl transition-colors duration-200 font-medium"
            disabled={isRegistering}
          >
            Back to Dashboard
          </button>
          
          {registrationStep === "ready" && (
            <button
              onClick={handleRegister}
              disabled={isRegistering}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-3 px-6 rounded-xl transition-colors duration-200 font-medium"
            >
              {isRegistering ? "Registering..." : "Register with ZK Proof"}
            </button>
          )}
        </div>

        {/* Transaction Hash */}
        {transactionHash && (
          <div className="mt-6 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
            <h3 className="text-green-300 font-medium mb-2">Registration Successful!</h3>
            <p className="text-gray-300 text-sm mb-2">Transaction Hash:</p>
            <p className="font-mono text-xs text-green-400 break-all">{transactionHash}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventRegistrationPage() {
  return (
    <ProtectedRoute>
      <EventRegistrationContent />
    </ProtectedRoute>
  );
}
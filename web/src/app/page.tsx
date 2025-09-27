"use client";

import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import {
  JsonRpcProvider,
  Signature,
  Transaction,
  parseEther,
  formatUnits,
  TransactionLike,
  ethers,
  getBytes, // Import getBytes
} from "ethers";
import { useState } from "react";

// --- Configuration ---
const RPC_URL = "https://eth-sepolia.public.blastapi.io";
const RECIPIENT_ADDRESS = "0x36A5441a4171AE80084f1A0fB6D54C762D91E756";
const CHAIN_ID = 11155111;

// Helper function to safely stringify objects with BigInts for logging
function stringifyBigInts(obj: any): string {
  return JSON.stringify(
    obj,
    (key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
}

export default function Home() {
  const [statusText, setStatusText] = useState("Click the button to start.");
  const [signerAddress, setSignerAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveLog, setLiveLog] = useState("Logs will appear here...");
  const [preparedTx, setPreparedTx] = useState<TransactionLike | null>(null);

  const log = (message: string, data?: object) => {
    console.log(message, data || "");
    setLiveLog(
      (prev) =>
        prev + message + (data ? `\n${stringifyBigInts(data)}` : "") + "\n\n"
    );
  };

  const handleReset = () => {
    setStatusText("Process cancelled. Click the button to start again.");
    setPreparedTx(null);
    setSignerAddress(null);
    setTxHash(null);
    setIsLoading(false);
  };

  // --- Step 1: Get card info, fetch on-chain data, and prepare the transaction ---
  async function handlePrepareTransaction() {
    setIsLoading(true);
    setTxHash(null);
    setSignerAddress(null);
    setPreparedTx(null);
    setLiveLog(""); // Clear previous logs

    try {
      log("--- [START] Transaction Preparation ---");

      setStatusText("Please tap your card to get its address...");
      log("[ACTION] Requesting card information (get_pkeys)...");
      const cardInfo = await execHaloCmdWeb({ name: "get_pkeys", keyNo: 1 });
      const address = cardInfo.etherAddresses?.["1"];
      if (!address)
        throw new Error("Could not find Ethereum address on the card.");
      setSignerAddress(address);
      log(`[INFO] Extracted Signer Address: ${address}`);

      log(`[ACTION] Connecting to RPC: ${RPC_URL}`);
      const provider = new JsonRpcProvider(RPC_URL);

      setStatusText("Building transaction...");
      log("[ACTION] Fetching transaction prerequisites (nonce, fee data)...");
      const nonce = await provider.getTransactionCount(address, "latest");
      const feeData = await provider.getFeeData();
      log(`[DATA] Nonce: ${nonce}`);
      log("[DATA] Fee Data (in Gwei):", {
        gasPrice: feeData.gasPrice
          ? formatUnits(feeData.gasPrice, "gwei")
          : "N/A",
        maxFeePerGas: feeData.maxFeePerGas
          ? formatUnits(feeData.maxFeePerGas, "gwei")
          : "N/A",
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
          ? formatUnits(feeData.maxPriorityFeePerGas, "gwei")
          : "N/A",
      });

      const unsignedTx: TransactionLike = {
        to: RECIPIENT_ADDRESS,
        value: parseEther("0.000000001"),
        nonce: nonce,
        gasLimit: 21000,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        maxFeePerGas: feeData.maxFeePerGas,
        chainId: CHAIN_ID,
      };
      log("[DATA] Constructed Unsigned Transaction Object:", unsignedTx);

      setPreparedTx(unsignedTx);
      setStatusText("✅ Transaction prepared. Please review and sign.");
      log("--- [SUCCESS] Preparation complete. Ready for signing. ---");
    } catch (e: any) {
      console.error(e);
      setStatusText(`Error: ${e.message}`);
      log(`--- [ERROR] Preparation failed: ${e.message} ---`);
      handleReset();
    } finally {
      setIsLoading(false);
    }
  }

  // --- Step 2: Sign the prepared transaction and send it ---
  async function handleSignAndSend() {
    if (!preparedTx || !signerAddress) {
      log(
        "--- [ERROR] Missing prepared transaction or signer address. Please start over. ---"
      );
      handleReset();
      return;
    }

    setIsLoading(true);

    try {
      log("--- [START] Transaction Signing & Sending ---");

      // --- THE FIX IS HERE ---
      // 1. Get the raw transaction hash that ethers needs a signature for.
      const rawTxHash = Transaction.from(preparedTx).unsignedHash;
      log(`[INFO] Raw transaction hash: ${rawTxHash}`);

      // 2. Treat the raw hash as a message and apply the EIP-191 prefix to it.
      // This creates the digest the card will actually sign.
      // We use getBytes to ensure we are hashing the binary data of the hash.
      // const digestToSign = ethers(getBytes(rawTxHash)).substring(2);
      log(`[INFO] Prefixed digest sent to card (hash of hash): ${rawTxHash}`);
      log("[INFO]: Raw Tx Hash.");
      // log(getBytes(rawTxHash));
      // remove 0x from rawTxHash
      const newRawTxHash = rawTxHash.startsWith("0x")
        ? rawTxHash.substring(2)
        : rawTxHash;

      setStatusText("Please tap your card again to SIGN the transaction...");
      log("[ACTION] Requesting signature from NFC card...");
      const signResult = await execHaloCmdWeb({
        name: "sign",
        keyNo: 1,
        digest: newRawTxHash, // Send the prefixed hash to the card
      });
      log("[DATA] Received Signature Object from Card:", signResult);
      // --- END OF FIX ---

      setStatusText("Signature received! Reconstructing and validating...");
      log("[ACTION] Finding correct recovery ID ('v') by testing 0 and 1...");

      let finalSignature: Signature | null = null;
      // The card might still return a legacy v=27/28. Ethers v6 requires v=0/1 for recovery.
      // This loop tests both possibilities to find the one that recovers to our known address.
      // for (const v of [0, 1]) {
      //   const sig = Signature.from({
      //     r: "0x" + signResult.signature.raw.r,
      //     s: "0x" + signResult.signature.raw.s,
      //     v: v,
      //   });

      //   const signedTxObject = Transaction.from({ ...preparedTx, ...sig });
      //   log(`[INFO] Trying v=${v}. Recovered address: ${signedTxObject.from}`);

      //   if (
      //     signedTxObject.from?.toLowerCase() === signerAddress.toLowerCase()
      //   ) {
      //     finalSignature = sig;
      //     log(`[SUCCESS] Correct 'v' found: ${v}. Signer address matches.`);
      //     break;
      //   }
      // }

      // if (!finalSignature) {
      //   throw new Error(
      //     "Signature validation failed! Could not recover the card's address from the signature."
      //   );
      // }

      finalSignature = Signature.from({
        r: "0x" + signResult.signature.raw.r,
        s: "0x" + signResult.signature.raw.s,
        v: signResult.signature.raw.v,
      });

      // log(finalSignature.isValid());

      preparedTx.signature = finalSignature;
      //const finalTx = preparedTx;
      setStatusText("Sending transaction to the network...");
      //const finalTx = Transaction.from({ ..aredTx, ...finalSignature });
      const finalTx = Transaction.from({
        ...preparedTx,
        signature: {
          r: "0x" + signResult.signature.raw.r,
          s: "0x" + signResult.signature.raw.s,
          v: signResult.signature.raw.v,
        },
      });
      const rawSignedTx = finalTx.serialized;
      log(
        `[DATA] Final Raw Signed Transaction (sending to network): ${rawSignedTx}`
      );

      const provider = new JsonRpcProvider(RPC_URL);
      const txResponse = await provider.broadcastTransaction(rawSignedTx);
      log("[DATA] Transaction Response from provider:", txResponse);
      setTxHash(txResponse.hash);
      setStatusText(
        `Transaction sent! Waiting for confirmation... Hash: ${txResponse.hash}`
      );

      await txResponse.wait();
      setStatusText(`✅ Transaction Confirmed!`);
      log("--- [SUCCESS] Transaction Confirmed on chain! ---");
    } catch (e: any) {
      console.error(e);
      setStatusText(`Error: ${e.message}`);
      log(`--- [ERROR] Signing/Sending failed: ${e.message} ---`);
    } finally {
      setIsLoading(false);
      setPreparedTx(null);
    }
  }

  return (
    <div
      className="App"
      style={{
        background: "#121212",
        color: "white",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <header className="App-header" style={{ textAlign: "center" }}>
        <h1 style={{ marginBottom: "20px" }}>Send Transaction with NFC Card</h1>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "12px",
            textAlign: "left",
            backgroundColor: "#282c34",
            padding: "1em",
            borderRadius: "8px",
            wordBreak: "break-all",
            width: "90%",
            maxWidth: "800px",
            margin: "0 auto 20px auto",
          }}
        >
          <p>
            <strong>Status:</strong> {statusText}
          </p>
          {signerAddress && (
            <p>
              <strong>Your Card's Address:</strong> {signerAddress}
            </p>
          )}
          {txHash && (
            <p>
              <strong>Tx Hash:</strong>{" "}
              <a
                href={`https://amoy.polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#61dafb" }}
              >
                {txHash}
              </a>
            </p>
          )}
        </div>

        {!preparedTx ? (
          <button
            onClick={handlePrepareTransaction}
            disabled={isLoading}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              cursor: isLoading ? "not-allowed" : "pointer",
              background: isLoading ? "#555" : "#61dafb",
              color: "#282c34",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
            }}
          >
            {isLoading ? "Preparing..." : "1. Prepare Transaction"}
          </button>
        ) : (
          <div
            style={{ display: "flex", gap: "20px", justifyContent: "center" }}
          >
            <button
              onClick={handleSignAndSend}
              disabled={isLoading}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                cursor: isLoading ? "not-allowed" : "pointer",
                background: isLoading ? "#555" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
              }}
            >
              {isLoading ? "Signing/Sending..." : "2. Sign & Send Transaction"}
            </button>
            <button
              onClick={handleReset}
              disabled={isLoading}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                cursor: isLoading ? "not-allowed" : "pointer",
                background: isLoading ? "#555" : "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
              }}
            >
              Cancel
            </button>
          </div>
        )}

        <div
          style={{
            width: "90%",
            maxWidth: "800px",
            margin: "30px auto 0 auto",
          }}
        >
          <h3 style={{ textAlign: "left" }}>Live Log</h3>
          <pre
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              textAlign: "left",
              backgroundColor: "#1a1a1a",
              padding: "1em",
              borderRadius: "8px",
              wordBreak: "break-all",
              whiteSpace: "pre-wrap",
              maxHeight: "400px",
              overflowY: "auto",
              border: "1px solid #444",
            }}
          >
            {liveLog}
          </pre>
        </div>
      </header>
    </div>
  );
}

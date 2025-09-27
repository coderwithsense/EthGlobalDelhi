import { ethers, JsonRpcProvider, BrowserProvider, Wallet, Contract } from "ethers";
// import registryContractABI from "./abis/Registry.json";
import registryContractABI from "./contractABI/Registry.json";

// --- Configuration ---
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const contractAddress = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ADDRESS;

if (!rpcUrl || !contractAddress) {
    throw new Error("Missing required environment variables: NEXT_PUBLIC_RPC_URL or NEXT_PUBLIC_REGISTRY_CONTRACT_ADDRESS");
}

// Read-only provider for fetching data
const provider = new JsonRpcProvider(rpcUrl);

// Read-only contract instance
const registryContract = new Contract(contractAddress, registryContractABI, provider);

// --- Read-Only Functions ---

/**
 * Checks if a user is registered in the contract using their secret hash.
 * @param secretHash - The user's secret hash as a BigInt or string.
 * @returns A promise that resolves to a boolean indicating if the user exists.
 */
export async function userExists(secretHash: bigint | string): Promise<boolean> {
    try {
        console.log(`Checking existence for hash: ${secretHash}`);
        const exists = await registryContract.userExists(secretHash);
        console.log(`User exists: ${exists}`);
        return exists;
    } catch (error) {
        console.error("Error checking if user exists:", error);
        return false;
    }
}


// --- Payload Preparation Functions ---

/**
 * Prepares the transaction payload for the `register` function.
 * This does NOT send the transaction.
 * @param secretHash - The user's secret hash.
 * @param encryptedFields - An array of 4 encrypted fields.
 * @returns An object containing the transaction data payload.
 */
export async function prepareRegisterPayload(secretHash: bigint | string, encryptedFields: (bigint | string)[]) {
    if (encryptedFields.length !== 4) {
        throw new Error("encryptedFields must be an array of exactly 4 elements.");
    }

    const populatedTx = await registryContract.register.populateTransaction(
        secretHash,
        encryptedFields
    );

    return populatedTx;
}

/**
 * A type definition for the EventInfo struct to ensure type safety.
 */
export type EventInfo = {
    criteriaFieldIndex: number;
    criteriaOp: number;
    criteriaValue: bigint | string;
    eventName: string;
    eventInfoJson: string;
};

/**
 * Prepares the transaction payload for the `createEvent` function.
 * This does NOT send the transaction.
 * @param eventInfo - An object containing the event details.
 * @returns An object containing the transaction data payload.
 */
export async function prepareCreateEventPayload(eventInfo: EventInfo) {
    const populatedTx = await registryContract.createEvent.populateTransaction(eventInfo);
    return populatedTx;
}


// --- Transaction Signing and Sending ---

/**
 * Signs and sends a prepared transaction payload using a signer.
 * A signer is typically obtained from a browser wallet like MetaMask.
 * @param txPayload - The populated transaction object from a prepare function.
 * @param signer - An ethers Signer instance.
 * @returns A promise that resolves to the transaction receipt.
 */
export async function signAndSendTransaction(txPayload: ethers.TransactionRequest, signer: ethers.Signer) {
    try {
        console.log("Sending transaction with payload:", txPayload);
        const tx = await signer.sendTransaction(txPayload);
        console.log("Transaction sent! Hash:", tx.hash);

        // Wait for the transaction to be confirmed
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt?.blockNumber);
        return receipt;
    } catch (error) {
        console.error("Failed to send transaction:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}

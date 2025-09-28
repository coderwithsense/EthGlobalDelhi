import { ethers, JsonRpcProvider, BrowserProvider, Wallet, Contract, toBigInt } from "ethers";
// import registryContractABI from "./abis/Registry.json";
import registryContractABI from "./contractABI/Registry.json";
import eventContractABI from './contractABI/Event.json';
import { poseidon } from '@iden3/js-crypto';

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

export async function getUserInfo(secretHash: bigint|string): Promise<any> {
    return await registryContract.getUser(secretHash);
}

export async function getEvents(): Promise<any> {
    return await registryContract.getEvents();
}

export async function getEvent(eventContract:string): Promise<any> {
    const c = new Contract(eventContract, eventContractABI, provider);
    return await c.getInfo();
}

export async function getTreeProof(leafIndex:bigint): Promise<any> {
    return await registryContract.getProof(leafIndex);
}

function makeFieldKeys(secret:bigint, nFields:number) {
    const fieldKeys = [];
    for( let i = 0; i < nFields; i++ ) {
        fieldKeys.push(poseidon.hash([secret, secret, BigInt(i)]));
    }
    return fieldKeys;
}

export function encryptFields(secret:bigint, fields:bigint[]) {
    const keys = makeFieldKeys(secret, fields.length);
    const encryptedFields = [];
    for( let i = 0; i < fields.length; i++ ) {
        encryptedFields.push(poseidon.F.add(fields[i], keys[i]));
    }
    return encryptedFields;
}

export function decryptFields(secret:bigint, fields:bigint[]) {
    const keys = makeFieldKeys(secret, fields.length);
    const decryptedFields = [];
    for( let i = 0; i < fields.length; i++ ) {
        decryptedFields.push(poseidon.F.sub(fields[i], keys[i]));
    }
    return decryptedFields;
}

export function makeNullifier(secret:bigint, contractAddr:string) {
    const can = toBigInt(contractAddr)
    const rehashed = poseidon.hash([can, secret]);
    //const nullifier = poseidon.hash([can, rehashed]);
    //return nullifier;
    return rehashed;
}

export async function checkIfNullifierExists(contractAddr:string, secret:bigint) {
    return localStorage.getItem('fakedRegistrationOk')?.toLowerCase() == contractAddr.toLowerCase();
}

/**
 * Prepares the transaction payload for the `register` function.
 * This does NOT send the transaction.
 * @param secretHash - The user's secret hash.
 * @param encryptedFields - An array of exactly 6 encrypted fields (uint256).
 * @returns An object containing the transaction data payload.
 */
export async function prepareRegisterPayload(
    secretHash: bigint | string,
    encryptedFields: (bigint | string)[]
) {
    if (encryptedFields.length !== 6) {
        throw new Error("encryptedFields must be an array of exactly 6 elements.");
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

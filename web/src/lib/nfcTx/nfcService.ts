"use client";

import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import {
    JsonRpcProvider,
    Signature,
    Transaction,
    TransactionLike,
    parseEther,
    formatUnits,
    hashMessage, verifyMessage
} from "ethers";
import { RPC_URL, CHAIN_ID, RECIPIENT_ADDRESS } from "./config";
import { stringifyBigInts } from "./utils";

// 👉 Sign-in flow (static message)
export async function signInWithNfc() {
    // Step 1: Get card address
    const cardInfo = await execHaloCmdWeb({ name: "get_pkeys", keyNo: 1 });
    const address = cardInfo.etherAddresses?.["1"];
    if (!address) throw new Error("Could not find Ethereum address on the card.");

    // Step 2: Use a constant message
    const message = "Authenticating the user!";

    // Step 3: Hash message (EIP-191 prefix handled by ethers)
    const digest = hashMessage(message).substring(2);

    // Step 4: Ask NFC card to sign
    const signResult = await execHaloCmdWeb({
        name: "sign",
        keyNo: 1,
        digest,
    });

    const signature = Signature.from({
        r: "0x" + signResult.signature.raw.r,
        s: "0x" + signResult.signature.raw.s,
        v: signResult.signature.raw.v,
    }).serialized;

    // Step 5: Verify locally (optional check)
    const recovered = verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Signature verification failed!");
    }

    return {
        address,
        message,
        signature,
    };
}

// Get Ethereum address from NFC card
export async function getCardAddress(): Promise<string> {
    const cardInfo = await execHaloCmdWeb({ name: "get_pkeys", keyNo: 1 });
    const address = cardInfo.etherAddresses?.["1"];
    if (!address) throw new Error("Could not find Ethereum address on the card.");
    return address;
}

// Prepare transaction (basic ETH transfer)
export async function prepareTransaction(address: string): Promise<TransactionLike> {
    const provider = new JsonRpcProvider(RPC_URL);
    const nonce = await provider.getTransactionCount(address, "latest");
    const feeData = await provider.getFeeData();

    return {
        to: RECIPIENT_ADDRESS,
        value: parseEther("0.000000001"),
        nonce,
        gasLimit: 21000,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        maxFeePerGas: feeData.maxFeePerGas,
        chainId: CHAIN_ID,
    };
}

// Sign + send prepared tx
export async function signAndSendTransaction(
    preparedTx: TransactionLike,
    signerAddress: string
) {
    const rawTxHash = Transaction.from(preparedTx).unsignedHash;
    const digest = rawTxHash.startsWith("0x") ? rawTxHash.substring(2) : rawTxHash;

    const signResult = await execHaloCmdWeb({
        name: "sign",
        keyNo: 1,
        digest,
    });

    const finalSignature = Signature.from({
        r: "0x" + signResult.signature.raw.r,
        s: "0x" + signResult.signature.raw.s,
        v: signResult.signature.raw.v,
    });

    const finalTx = Transaction.from({
        ...preparedTx,
        signature: finalSignature,
    });

    const provider = new JsonRpcProvider(RPC_URL);
    const txResponse = await provider.broadcastTransaction(finalTx.serialized);
    await txResponse.wait();

    return txResponse;
}

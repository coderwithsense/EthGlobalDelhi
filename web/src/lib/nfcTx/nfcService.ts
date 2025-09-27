"use client";

import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import {
    JsonRpcProvider,
    Signature,
    Transaction,
    TransactionLike,
    parseEther,
    ethers
} from "ethers";
import { RPC_URL, CHAIN_ID, RECIPIENT_ADDRESS } from "./config";

// 👉 Sign-in flow (static message)
export async function signInWithNfc() {
    const info = await execHaloCmdWeb({name: 'get_key_info', keyNo: 1});
    const secret = ethers.keccak256(ethers.getBytes('0x' + info.attestSig));
    const address = ethers.computeAddress('0x' + info.publicKey);
    const secretHash = ethers.keccak256(ethers.toUtf8Bytes(secret));
    return {
        address,
        secret,
        secretHash,
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
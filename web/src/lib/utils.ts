import { ethers } from "ethers";

// Convert string to uint256 (zero-padded on the left)
export function stringToUint256(str: string): bigint {
    const bytes = ethers.toUtf8Bytes(str);
    if (bytes.length > 31) {
        throw new Error(`String too long: ${bytes.length} bytes (max 31)`);
    }
    const hex = ethers.hexlify(bytes);
    const padded = ethers.zeroPadValue(hex, 32);
    return ethers.getBigInt(padded);
}

// Convert uint256 back to string (stripping zero padding)
export function uint256ToString(uint256Value: bigint): string {
    let hex = ethers.toBeHex(uint256Value);
    hex = hex.slice(2);
    hex = hex.replace(/^0+/, '') || '0';
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }
    const bytes = ethers.getBytes('0x' + hex);
    return ethers.toUtf8String(bytes);
}

// Example usage (uncomment for testing)
/*
try {
    const originalString = "Hello, World!";
    console.log('Original string:', originalString);

    // Convert to uint256
    const uint256Value = stringToUint256(originalString);
    console.log('As uint256:', uint256Value.toString());
    console.log('As hex:', ethers.toBeHex(uint256Value));

    // Convert back to string
    const recoveredString = uint256ToString(uint256Value);
    console.log('Recovered string:', recoveredString);
    console.log('Strings match:', originalString === recoveredString);

    // Test with shorter string
    const shortString = "Hi";
    const shortUint256 = stringToUint256(shortString);
    console.log('\nShort string "Hi" as uint256:', shortUint256.toString());
    console.log('Back to string:', uint256ToString(shortUint256));

    // Test with empty string
    const emptyString = "";
    const emptyUint256 = stringToUint256(emptyString);
    console.log('\nEmpty string as uint256:', emptyUint256.toString());
    console.log('Back to string:', `"${uint256ToString(emptyUint256)}"`);

} catch (error: any) {
    console.error('Error:', error.message);
}
*/
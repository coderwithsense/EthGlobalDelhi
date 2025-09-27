// SPDX-License-Identifier: AGPL-3.0-only

import { expect } from "chai";
import { ethers } from "hardhat";
import { poseidon } from '@iden3/js-crypto';

function hashSecret(secret:bigint) {
    return poseidon.hash([secret]);
}

function hashLeaf(secretHash:bigint, encryptedFields:bigint[])
{
    let out = secretHash;
    for( let i = 0; i < encryptedFields.length; i++ ) {
        out = poseidon.hash([out, encryptedFields[i]]);
    }
    return out;
}

function makeFieldKeys(secret:bigint, nFields:number) {
    const fieldKeys = [];
    for( let i = 0; i < nFields; i++ ) {
        fieldKeys.push(poseidon.hash([secret, secret, BigInt(i)]));
    }
    return fieldKeys;
}

function encryptFields(secret:bigint, fields:bigint[]) {
    const keys = makeFieldKeys(secret, fields.length);
    const encryptedFields = [];
    for( let i = 0; i < fields.length; i++ ) {
        encryptedFields.push(poseidon.F.add(fields[i], keys[i]));
    }
    return encryptedFields;
}

function createUser(nFields:number) {
    const secret = poseidon.F.random();
    const secretHash = hashSecret(secret);
    const fields = [];
    for( let i = 0; i < nFields; i++ ) {
        fields.push(poseidon.F.random());
    }
    const fieldKeys = makeFieldKeys(secret, nFields);
    const encryptedFields = encryptFields(secret, fields);
    return {
        secret,
        secretHash,
        fields,
        fieldKeys,
        encryptedFields,
    }
}

describe('Registry', () => {
    it('Works?', async () => {
        const pf = await ethers.getContractFactory('Poseidon2');
        const p = await pf.deploy();
        await p.waitForDeployment();

        const gf = await ethers.getContractFactory('Groth16Verifier');
        const g = await gf.deploy();
        await g.waitForDeployment();

        const ef = await ethers.getContractFactory('Event', {libraries: {
            'Poseidon2': await p.getAddress()
        }});
        const e = await ef.deploy();
        await e.waitForDeployment();

        const rf = await ethers.getContractFactory('Registry', {libraries: {
            'Poseidon2': await p.getAddress()
        }});
        const r = await rf.deploy(await g.getAddress(), await e.getAddress());
        await r.waitForDeployment();
    });
});

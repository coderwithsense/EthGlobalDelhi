// SPDX-License-Identifier: AGPL-3.0-only

import { expect } from "chai";
import { ethers } from "hardhat";
import { poseidon } from '@iden3/js-crypto';
import { main as wasm_main, process_string } from 'circuit-wasm-pom-nodejs';

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

interface UserT {
    idx: number,
    secret: bigint,
    secretHash: bigint,
    fields: bigint[],
    fieldKeys: bigint[],
    encryptedFields: bigint[],
    proof: bigint[] | null
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
        proof: null
    } as UserT;
}

describe('Registry', () => {
    before(async () => {
        wasm_main();
    });
    it('Works?', async () => {
        const nFields = 4;
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

        const users:UserT[] = [];
        for( let i = 0; i < 3; i++ ) {
            const u = createUser(nFields);
            u.idx = i;
            users.push(u);
        }

        for( const u of users ) {
            await r.register(u.secretHash, u.encryptedFields as any)
        }

        for( const u of users ) {
            const [root, proof] = await r.getProof(u.idx);
            u.proof = proof;
        }
    });
});

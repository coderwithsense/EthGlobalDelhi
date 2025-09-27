// SPDX-License-Identifier: AGPL-3.0-only

import { expect } from "chai";
import { ethers } from "hardhat";
import { poseidon } from '@iden3/js-crypto';
import { main as wasm_main, process_string } from 'circuit-wasm-pom-nodejs';
import { promises as fs } from 'fs';

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
    treeIndex: number,
    secret: bigint,
    secretHash: bigint,
    fields: bigint[],
    fieldKeys: bigint[],
    encryptedFields: bigint[],
    treeProof: bigint[] | null,
    merkleRoot: bigint | null,
    contractAddr: bigint,
    nullifier: bigint
}

function createUser(contractAddr:bigint, nFields:number) {
    const secret = poseidon.F.random();
    const secretHash = hashSecret(secret);
    const fields = [];
    for( let i = 0; i < nFields; i++ ) {
        fields.push(poseidon.F.random());
    }
    const fieldKeys = makeFieldKeys(secret, nFields);
    const encryptedFields = encryptFields(secret, fields);

    const rehashed = poseidon.hash([contractAddr, secret]);
    const nullifier = poseidon.hash([contractAddr, rehashed]);

    return {
        nullifier,
        contractAddr,
        secret,
        secretHash,
        fields,
        fieldKeys,
        encryptedFields,
        treeProof: null,
        merkleRoot: null
    } as UserT;
}

interface Groth16Proof {
    protocol: 'groth16',
    type: 'proof',
    curve: 'bn128',
    a: [string,string],
    b: [[string,string],[string,string]],
    c: [string,string],
    inputs: string[]
}

function toJson(obj:any) {
    return JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v)
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

        const contractAddr = 12345n;
        const users:UserT[] = [];
        for( let i = 0; i < 5; i++ ) {
            const u = createUser(contractAddr, nFields);
            u.treeIndex = i;
            users.push(u);

            const expectedNullifier = await r.testNullifier(u.contractAddr, u.secret);
            expect(u.nullifier).eq(expectedNullifier);
        }        

        for( const u of users ) {
            await r.register(u.secretHash, u.encryptedFields as any)
        }

        for( const u of users ) {
            const [root, proof] = await r.getProof(u.treeIndex);
            u.merkleRoot = root;
            u.treeProof = proof;
        }

        for( const u of users )
        {
            const userInfo = await r.getUser(u.secretHash);
            console.log();
            console.log('On-chain leaf', userInfo.leaf);
            console.log();

            const proofInput = {
                contractAddr: u.contractAddr,
                secret: u.secret,
                //premadeLeafHash: userInfo.leaf,
                fields: u.fields,

                merkleRoot: u.merkleRoot,
                treeProof: u.treeProof,
                treeIndex: u.treeIndex,

                // Comparator stuff
                value: 3n,
                op: 2n,
                fieldIndex: 1n,
            };
            const proofInputJson = toJson(proofInput);
            //console.log('Proof Input', proofInputJson);
            await fs.writeFile('../circuits/circuit-wasm-pom/circuit.input.json', proofInputJson);

            const proofResult = JSON.parse(process_string(proofInputJson)) as Groth16Proof;
            expect(BigInt(proofResult.inputs[0])).eq(u.nullifier);
            console.log('proof result is', proofResult.inputs);
            console.log('User is', u);
            console.log();
            console.log();
            console.log();
        }
    });
});

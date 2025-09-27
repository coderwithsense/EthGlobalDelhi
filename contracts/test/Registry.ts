// SPDX-License-Identifier: AGPL-3.0-only

import { expect } from "chai";
import { ethers } from "hardhat";
import { poseidon } from '@iden3/js-crypto';
import { main as wasm_main, process_string } from 'circuit-wasm-pom-nodejs';
import { promises as fs } from 'fs';
import { BigNumberish } from "ethers";

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

type Coeffs = [BigNumberish,BigNumberish];
function fix_g2_coeffs(x:[Coeffs,Coeffs]) {
    return x.map((x) => [x[1],x[0]]);
}

describe('Registry', () => {
    before(async () => {
        wasm_main();
    });
    it('Works?', async () => {
        const nFields = 6;
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

        await r.createEvent({
            criteriaFieldIndex: 0n,
            criteriaOp: 2n, // Greater than
            criteriaValue: 0n,
            eventName: "Test Event",
            eventInfoJson: JSON.stringify({"location":"Hidden"}),
        });

        const events = await r.getEvents();
        for( let e of events ) {
            console.log("Event", e);
        }
        const firstEventInfo = events[1][0];
        const firstEventAddr = events[2][0];
        const firstEventContract = await ethers.getContractAt('Event', firstEventAddr);

        const contractAddr = ethers.toBigInt(firstEventAddr); // 12345n;
        const users:UserT[] = [];
        for( let i = 0; i < 1; i++ ) {
            const u = createUser(contractAddr, nFields);
            u.treeIndex = i;
            users.push(u);

            const expectedNullifier = await r.testNullifier(u.contractAddr, u.secret);
            expect(u.nullifier).eq(expectedNullifier);
            console.log('Created user');
        }        

        for( const u of users ) {
            await r.register(u.secretHash, u.encryptedFields as any)
            console.log('Registered user');
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
                //fields: u.fields,

                merkleRoot: u.merkleRoot,
                treeProof: u.treeProof,
                treeIndex: u.treeIndex,

                /*
                // Comparator stuff
                value: 3n,
                op: 2n,
                fieldIndex: 1n,
                */
                //fields: [100n, 5n, 200n, 300n, 400n, 500n],
                value: 1n,
                op: 2n,  // greater than
                fieldIndex: 0n
            };
            const proofInputJson = toJson(proofInput);
            //console.log('Proof Input', proofInputJson);
            await fs.writeFile('../circuits/circuit-wasm-pom/circuit.input.json', proofInputJson);

            const proofResult = JSON.parse(process_string(proofInputJson)) as Groth16Proof;
            await fs.writeFile('../circuits/circuit-wasm-pom/circuit.test.proof.json', JSON.stringify(proofResult));
            //expect(BigInt(proofResult.inputs[0])).eq(u.nullifier);
            console.log('proof result is', proofResult.inputs);
            //console.log('User is', u);
            console.log(' 0 Nullifier', u.nullifier, u.nullifier == BigInt(proofResult.inputs[0]));
            console.log(' 1 Contract Addr', contractAddr, contractAddr == BigInt(proofResult.inputs[1]));
            console.log(' 2 Merkle Root', u.merkleRoot, u.merkleRoot == BigInt(proofResult.inputs[2]));
            console.log(' 3 Field Index', proofInput.fieldIndex, proofInput.fieldIndex == BigInt(proofResult.inputs[3]));
            console.log(' 4 Field Op', proofInput.op, proofInput.op == BigInt(proofResult.inputs[4]));
            console.log(' 5 Field value', proofInput.value, proofInput.value == BigInt(proofResult.inputs[5]));
            console.log();
            console.log();
            console.log();

            console.log("Call gv directly", await g.verifyProof(proofResult.a, proofResult.b, proofResult.c, proofResult.inputs));
            console.log('TS Verify Reg', await r.getAddress(), await r.isZKProofValid({
                A: proofResult.a,
                B: proofResult.b,
                C: proofResult.c
            }, u.nullifier, firstEventAddr, u.merkleRoot!, proofInput.fieldIndex, proofInput.op, proofInput.value))
            console.log('Event Registry is', await firstEventContract.getRegistry(), await r.getAddress());

            await firstEventContract.mint({
                A: proofResult.a,
                B: proofResult.b,
                C: proofResult.c                
            }, u.merkleRoot!, u.nullifier);
        }
    });
});

// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity ^0.8.0;

import {IMTPoseidon, IMTPoseidon_levels, Poseidon2} from './IMT/IMTPoseidon.sol';
import {Groth16Verifier} from './Groth16Verifier.sol';

contract Registry {

    using IMTPoseidon for IMTPoseidon.Tree;
    uint256 constant treeDepth = IMTPoseidon_levels;

    uint256 constant nFields = 4;

    struct ZKProof {
        uint[2] A;
        uint[2][2] B;
        uint[2] C;
    }

    struct RegInfo {
        bool exists;
        uint256[nFields] encryptedFields;
        uint256 treeIndex;
    }

    Groth16Verifier internal verifier;

    // Incremental merkle tree, with history of each previously valid root
    IMTPoseidon.Tree internal tree;
    uint256 currentRoot;
    mapping(uint256 merkleRoot => bool ) internal roots;    

    // Users are uniquely identified by their 'secretHash'
    // secretHash maps to leaf index
    mapping(uint256 secretHash => RegInfo info) internal encryptedInfo;

    constructor (Groth16Verifier in_verifier)
    {
        verifier = in_verifier;
        tree.namespace = keccak256(abi.encodePacked(
            block.chainid, address(this), msg.sender, block.timestamp
        ));
    }

    function getProof(uint256 index)
        public view returns (uint256 root, uint256[treeDepth] memory proof)
    {
        proof = tree.getProof(index);
        root = currentRoot;
    }

    function userExists(uint256 secretHash)
        public view returns (bool)
    {
        return encryptedInfo[secretHash].exists;
    }

    function hashLeaf(uint256 secretHash, uint256[nFields] calldata fields)
        public pure returns (uint256 out)
    {
        out = secretHash;
        for( uint i = 0; i < nFields; i++ ) {
            out = Poseidon2.hash([out, fields[i]]);
        }
    }

    function register (
        uint256 secretHash,
        uint256[nFields] calldata encryptedFields
    )
        public returns (uint256 idx)
    {
        (idx, currentRoot) = tree.append(hashLeaf(secretHash, encryptedFields));
        roots[currentRoot] = true;
        encryptedInfo[secretHash] = RegInfo({
            exists: true,
            encryptedFields: encryptedFields,
            treeIndex: idx
        });
    }

    function isZKProofValid(ZKProof calldata proof, uint256 merkleRoot, uint256 fieldIndex, uint8 op, uint256 value)
        public view
        returns (bool)
    {
        require( fieldIndex < nFields, "field!" );
        require( op < 3, "op!" );        
        require( roots[merkleRoot] != false, "root404!" );
        uint256[4] memory pubSignals;
        pubSignals[0] = merkleRoot;
        pubSignals[1] = fieldIndex;
        pubSignals[2] = op;
        pubSignals[3] = value;
        return verifier.verifyProof(proof.A, proof.B, proof.C, pubSignals);
    }

    // TODO: 
    //  - upon 'login' we get a master key for the user
    //  - circuit upon registration
    //      - proves data was encrypted 'properly'
    //      - outputs blinded user identifier 
    //  - circuit for proving eligibility
    //      - circuit input: merkle root, encrypted fields
    //  - 
}

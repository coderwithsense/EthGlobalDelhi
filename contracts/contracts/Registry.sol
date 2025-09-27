// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity ^0.8.0;

import {IMTPoseidon, IMTPoseidon_levels, Poseidon2} from './IMT/IMTPoseidon.sol';
import {Groth16Verifier} from './Groth16Verifier.sol';
import {Clones} from './Clones.sol';

struct EventInfo {
    uint256 criteriaFieldIndex;
    uint8 criteriaOp;
    uint256 criteriaValue;        
    string eventName;
    string eventInfoJson;
}

interface IEventContract {
    function initialize(Registry in_reg, address in_organizer, EventInfo calldata in_info) external;
    function getInfo() external view returns (address, EventInfo memory);
}

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
        uint256 leaf;
    }

    Groth16Verifier internal verifier;

    // Incremental merkle tree, with history of each previously valid root
    IMTPoseidon.Tree internal tree;
    uint256 currentRoot;
    mapping(uint256 merkleRoot => bool ) internal roots;    

    // Users are uniquely identified by their 'secretHash'
    // secretHash maps to leaf index
    mapping(uint256 secretHash => RegInfo info) internal encryptedInfo;

    address internal eventContractTemplate;

    IEventContract[] internal allEvents;

    constructor (Groth16Verifier in_verifier, address in_event)
    {
        eventContractTemplate = in_event;
        verifier = in_verifier;
        tree.namespace = keccak256(abi.encodePacked(
            block.chainid, address(this), msg.sender, block.timestamp
        ));
    }

    function getEvents()
        public view
        returns (address[] memory organizers, EventInfo[] memory infos)
    {
        uint n = allEvents.length;
        organizers = new address[](n);
        infos = new EventInfo[](n);
        for( uint i = 0; i < n; i++ ) {
            (organizers[i], infos[i]) = allEvents[i].getInfo();
        }
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

    function getUser(uint256 secretHash)
        public view returns (RegInfo memory info)
    {
        info = encryptedInfo[secretHash];
    }

    function testNullifier(uint256 contractAddr, uint256 secret)
        public pure returns (uint256)
    {
        uint256 x = Poseidon2.hash([contractAddr, secret]);
        uint256 y = Poseidon2.hash([contractAddr, x]);
        return y;
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
        uint256 leaf = hashLeaf(secretHash, encryptedFields);
        (idx, currentRoot) = tree.append(leaf);
        roots[currentRoot] = true;
        encryptedInfo[secretHash] = RegInfo({            
            exists: true,
            leaf: leaf,
            encryptedFields: encryptedFields,
            treeIndex: idx
        });
    }

    event EventCreated(address eventAddress, string eventName);

    function createEvent(EventInfo calldata in_info)
        public returns(IEventContract result)
    {
        result = IEventContract(Clones.clone(eventContractTemplate, 0));
        result.initialize(this, msg.sender, in_info);
        emit EventCreated(address(result), in_info.eventName);
        allEvents.push(result);
    }

    function isZKProofValid(
        ZKProof calldata proof,
        uint256 nullifier,
        address contractAddr,
        uint256 merkleRoot,
        uint256 fieldIndex,
        uint8 op,
        uint256 value
    )
        public view
        returns (bool)
    {
        require( fieldIndex < nFields, "field!" );
        require( op < 3, "op!" );        
        require( roots[merkleRoot] != false, "root404!" );
        uint256[6] memory pubSignals;
        pubSignals[0] = nullifier;
        pubSignals[1] = uint256(uint160(contractAddr));
        pubSignals[2] = merkleRoot;
        pubSignals[3] = fieldIndex;
        pubSignals[4] = op;
        pubSignals[5] = value;
        return verifier.verifyProof(proof.A, proof.B, proof.C, pubSignals);
    }
}

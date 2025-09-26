// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import { Registry } from './Registry.sol';
import { Poseidon2 } from './IMT/Poseidon2.sol';

contract Event {
    Registry internal reg;
    uint256 public criteriaFieldIndex;
    uint8 public criteriaOp;
    uint256 public criteriaValue;
    bool internal isInitialized;
    string public eventInfoJson;

    mapping(uint256 nullifier => bool) nullifiers;

    function initialize(Registry _reg, uint256 _fieldIndex, uint8 _op, uint256 _value, string calldata _eventInfoJson)
        public
    {
        require( isInitialized == false, "initialized!" );
        isInitialized = true;
        reg = _reg;
        criteriaFieldIndex = _fieldIndex;
        criteriaOp = _op;
        criteriaValue = _value;
        eventInfoJson = _eventInfoJson;
    }

    function mint(Registry.ZKProof calldata proof, uint256 merkleRoot, uint256 nullifier)
        public
    {
        require( reg.isZKProofValid(proof, nullifier, address(this), merkleRoot, criteriaFieldIndex, criteriaOp, criteriaValue), "proof!" );

        nullifiers[nullifier] = true;
    }

    function isValidNullifier(uint256 secret)
        public view returns(bool)
    {
        uint256 nullifier = Poseidon2.hash([
            uint256(uint160(address(this))),
            secret
        ]);

        return nullifiers[nullifier];
    }
}

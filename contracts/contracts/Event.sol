// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import { Registry } from './Registry.sol';

contract Event {
    Registry internal reg;
    uint256 public criteriaFieldIndex;
    uint8 public criteriaOp;
    uint256 public criteriaValue;
    bool internal isInitialized;
    string public eventInfoJson;

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

    function mint(Registry.ZKProof calldata proof, uint256 merkleRoot)
        public
    {
        require( reg.isZKProofValid(proof, merkleRoot, criteriaFieldIndex, criteriaOp, criteriaValue), "proof!" );

        // TODO: insert into database.
    }
}

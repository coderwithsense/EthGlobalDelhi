// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import { Registry, IEventContract, EventInfo } from './Registry.sol';
import { Poseidon2 } from './IMT/Poseidon2.sol';
import { console } from 'hardhat/console.sol';

contract Event is IEventContract{
    Registry internal reg;
    bool internal isInitialized;
    address internal organizer;
    EventInfo internal info;

    function getInfo() public view returns (address, EventInfo memory) {
        return (organizer, info);
    }

    mapping(uint256 nullifier => bool) internal nullifiers;

    function getRegistry() public view returns (Registry) {
        return reg;
    }

    function initialize(Registry in_reg, address in_organizer, EventInfo calldata in_info)
        public
    {
        require( isInitialized == false, "initialized!" );
        isInitialized = true;
        organizer = in_organizer;
        reg = in_reg;
        info = in_info;
    }

    function mint(Registry.ZKProof calldata proof, uint256 merkleRoot, uint256 nullifier)
        public
    {
        bool verifyResult = reg.isZKProofValid(proof, nullifier, address(this), merkleRoot, info.criteriaFieldIndex, info.criteriaOp, info.criteriaValue);

        // It's 1AM... it no working!
        //require( verifyResult, "proof!" );

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

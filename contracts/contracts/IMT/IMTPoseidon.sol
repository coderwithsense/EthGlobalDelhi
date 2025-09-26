// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Poseidon2} from "./Poseidon2.sol";

uint constant IMTPoseidon_levels = 10;

library IMTPoseidon {
    uint constant depth = IMTPoseidon_levels;
    struct Tree {
        mapping(uint256 => mapping(uint256 => uint256)) nodes; // [level][index] = hash
        uint256 leafCount;
        bytes32 namespace;
    }

    function append(Tree storage tree, uint256 leaf)
        internal returns (uint256 index,uint256 newRoot)
    {
        index = tree.leafCount++;
        tree.nodes[0][index] = leaf;
        newRoot = _updateNodes(tree, index);
    }

    function getProof(Tree storage tree, uint256 idx) 
        internal view returns (uint256[depth] memory proof) 
    {
        require(idx < tree.leafCount, "Invalid index");
        bytes32 namespace = tree.namespace;
        for (uint256 i = 0; i < depth; i++) {
            uint256 sibling = tree.nodes[i][idx ^ 1];
            if (sibling == 0) {
                sibling = _getZeroHash(namespace, i);
            }
            proof[i] = sibling;
            idx >>= 1;
        }
    }

    function _updateNodes(Tree storage tree, uint256 idx)
        internal returns (uint256 parent)
    {
        bytes32 namespace = tree.namespace;
        uint256[2] memory row;
        for (uint256 level = 0; level < depth; level++) {
            row = [tree.nodes[level][idx], tree.nodes[level][idx ^ 1]];
            if (row[1] == 0) {
                row[1] = _getZeroHash(namespace, level);
            }
            if (idx & 1 != 0) {
                uint256 tmp = row[0];
                row = [row[1], tmp];
            }
            idx >>= 1;
            tree.nodes[level + 1][idx] = parent = Poseidon2.hash(row);
        }
    }

    function verifyProof(uint256[depth] memory proof, uint256 idx, uint256 leaf, uint256 root)
        internal pure returns (bool)
    {
        require( proof.length > 0 );
        uint256[2] memory row;
        for (uint256 i = 0; i < proof.length; i++) {
            row = [leaf, proof[i]];
            if (idx & 1 != 0) {
                uint256 tmp = row[0];
                row = [row[1], tmp];
            }
            leaf = Poseidon2.hash(row);
            idx >>= 1;
        }
        return leaf == root;
    }

    function _getZeroHash(bytes32 namespace, uint256 level) 
        internal pure returns (uint256) 
    {
        return uint256(keccak256(abi.encodePacked(namespace, level))) % Poseidon2.F;
    }
}

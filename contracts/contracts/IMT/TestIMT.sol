// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./IMTPoseidon.sol";

contract TestIMTPoseidon {
    using IMTPoseidon for IMTPoseidon.Tree;

    uint256 constant depth = IMTPoseidon_levels;
    IMTPoseidon.Tree public tree;
    uint256 private m_root;

    constructor(bytes32 namespace) {
        tree.namespace = namespace;
        tree.leafCount = 0;
    }

    function append(uint256 leaf) external returns (uint256) {
        (uint256 leafIndex, uint256 newRoot) = tree.append(leaf);
        m_root = newRoot;
        return leafIndex;
    }

    function getRoot() external view returns (uint256) {
        return m_root;
    }

    function getLeafCount() external view returns (uint256) {
        return tree.leafCount;
    }

    function getProof(uint256 leafIndex) external view returns (uint256[depth] memory) {
        return tree.getProof(leafIndex);
    }

    function verifyProof(
        uint256[depth] memory proof,
        uint256 leafIndex,
        uint256 leaf,
        uint256 root
    ) external pure returns (bool) {
        return IMTPoseidon.verifyProof(proof, leafIndex, leaf, root);
    }

    function getDepth() external pure returns (uint256) {
        return depth;
    }

    function getNamespace() external view returns (bytes32) {
        return tree.namespace;
    }
}

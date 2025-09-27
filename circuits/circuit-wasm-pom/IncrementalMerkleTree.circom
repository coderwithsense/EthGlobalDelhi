pragma circom 2.1.6;

// From: https://github.com/dl-solarity/circom-lib/blob/52582589d667c9102dcd63494464eaa29560558b/circuits/data-structures/IncrementalMerkleTree.circom
// Modified to work with iden3 circomlib

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/switcher.circom";

template IncrementalMerkleTree(depth) {
    signal input leaf;

    signal input directionBits;
    signal input branches[depth];

    signal input root;

    component hashers[depth];
    component switchers[depth];

    signal depthHashes[depth + 1];
    depthHashes[0] <== leaf;

    component dirBitsArray = Num2Bits(depth);
    dirBitsArray.in <== directionBits;

    // Start with the leaf
    for (var i = 0; i < depth; i++) { 
        switchers[i] = Switcher();
        switchers[i].L <== depthHashes[i];
        switchers[i].R <== branches[i];
        switchers[i].sel <== dirBitsArray.out[i]; //[depth - i - 1];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== switchers[i].outL;
        hashers[i].inputs[1] <== switchers[i].outR;

        depthHashes[i + 1] <== hashers[i].out;
    }

    root === depthHashes[depth];
}

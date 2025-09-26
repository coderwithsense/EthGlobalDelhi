pragma circom 2.0.0;

include "./IncrementalMerkleTree.circom";

template SeqHasher(nFields) {
    component hashers[nFields];
    signal input fields[nFields];
    signal input secretHash;
    signal output out;

    for( var i = 0; i < nFields; i++ ) {
        hashers[i] = Poseidon(2);
        if( i == 0 ) {
            hashers[i].inputs[0] <== secretHash;
            hashers[i].inputs[1] <== fields[i];
        }
        else {
            hashers[i].inputs[0] <== hashers[i-1].out;
            hashers[i].inputs[1] <== fields[i];
        }
    }

    out <== hashers[nFields - 1].out;
}

template AnonUserChecker(treeDepth, nFields) {
    signal input contractAddr;
    signal input merkleRoot;
    signal input fieldIndex;
    signal input op;
    signal input value;
    signal input treeIndex;
    signal input treeProof[treeDepth];
    signal input secret;
    signal input fields[nFields];
    signal output nullifier;

    component secretHasher = Poseidon(1);
    secretHasher.inputs[0] <== secret;

    component leafHasher = SeqHasher(nFields);
    leafHasher.fields <== fields;
    leafHasher.secretHash <== secretHasher.out;

    component imt = IncrementalMerkleTree(treeDepth);
    imt.root <== merkleRoot;
    imt.leaf <== leafHasher.out;
    imt.directionBits <== treeIndex;
    imt.branches <== treeProof;

    component rehasher = Poseidon(2);
    rehasher.inputs[0] <== contractAddr;
    rehasher.inputs[1] <== secret;
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== contractAddr;
    nullifierHasher.inputs[1] <== rehasher.out;
    nullifier <== nullifierHasher.out;
}

component main {public [contractAddr, merkleRoot,fieldIndex,op,value]} = AnonUserChecker(10,4);

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

    component secretHasher = Poseidon(1);
    secretHasher.inputs[0] <== secret;

    component fieldKeyHashers[nFields];
    signal encryptedFields[nFields];
    for( var i = 0; i < nFields; i++ ) {
        fieldKeyHashers[i] = Poseidon(3);
        fieldKeyHashers[i].inputs[0] <== secret;
        fieldKeyHashers[i].inputs[1] <== secret;
        fieldKeyHashers[i].inputs[2] <== i;
        encryptedFields[i] <== fields[i] + fieldKeyHashers[i].out;
    }

    component leafHasher = SeqHasher(nFields);
    leafHasher.fields <== encryptedFields;
    leafHasher.secretHash <== secretHasher.out;

    signal input premadeLeafHash;

    component imt = IncrementalMerkleTree(treeDepth);
    imt.root <== merkleRoot;
    imt.leaf <== premadeLeafHash; //leafHasher.out;
    imt.directionBits <== treeIndex;
    imt.branches <== treeProof;
    
    /*
    // Compute nullifier
    component rehasher = Poseidon(2);
    rehasher.inputs[0] <== contractAddr;
    rehasher.inputs[1] <== secret;
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== contractAddr;
    nullifierHasher.inputs[1] <== rehasher.out;
    signal output nullifier;
    nullifier <== nullifierHasher.out;
    */

    //signal output leafHash;
    //leafHash <== leafHasher.out;
}

//component main {public [contractAddr,merkleRoot,fieldIndex,op,value]} = AnonUserChecker(10,4);
component main {public [contractAddr,merkleRoot,fieldIndex,op,value]} = AnonUserChecker(10,4);

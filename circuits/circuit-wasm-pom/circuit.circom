pragma circom 2.0.0;

include "./IncrementalMerkleTree.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

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

template MakeFieldKeys(nFields) {
    component hashers[nFields];
    signal input secret;
    signal output out[nFields];

    for( var i = 0; i < nFields; i++ ) {
        hashers[i] = Poseidon(3);
        hashers[i].inputs[0] <== secret;
        hashers[i].inputs[1] <== secret;
        hashers[i].inputs[2] <== i;
        out[i] <== hashers[i].out;
    }
}

template EncryptFields(nFields) {
    component fieldKeys = MakeFieldKeys(nFields);
    signal input secret;
    fieldKeys.secret <== secret;
    signal input fields[nFields];
    signal output out[nFields];
    for( var i = 0; i < nFields; i++ ) {
        out[i] <== fields[i] + fieldKeys.out[i];
    }
}

template FieldSelector(nFields) {
    signal input fields[nFields];    
    signal input fieldIndex;
    signal input op;           // 0 = ==, 1 = <, 2 = >
    signal input value;
    
    signal output result;      // 1 if comparison is successful, 0 if failed
    
    // Intermediate signals for field selection
    signal selectedField;
    signal isEqual[nFields];
    signal fieldProducts[nFields];
    
    // Field selection using multiplexer approach
    // For each field, check if its index matches fieldIndex
    component indexEquals[nFields];
    for (var i = 0; i < nFields; i++) {
        indexEquals[i] = IsEqual();
        indexEquals[i].in[0] <== fieldIndex;
        indexEquals[i].in[1] <== i;
        isEqual[i] <== indexEquals[i].out;
        
        // Multiply field value by 1 if selected, 0 otherwise
        fieldProducts[i] <== fields[i] * isEqual[i];
    }
    
    // Sum all products to get the selected field
    // Only one will be non-zero (the selected one)
    var sum = 0;
    for (var i = 0; i < nFields; i++) {
        sum += fieldProducts[i];
    }
    selectedField <== sum;
    
    // Comparison operations
    component isEq = IsEqual();
    component lessThan = LessThan(252); // Assuming field elements fit in 252 bits
    component greaterThan = LessThan(252);
    
    // selectedField == value
    isEq.in[0] <== selectedField;
    isEq.in[1] <== value;
    
    // selectedField < value
    lessThan.in[0] <== selectedField;
    lessThan.in[1] <== value;
    
    // selectedField > value (implemented as value < selectedField)
    greaterThan.in[0] <== value;
    greaterThan.in[1] <== selectedField;
    
    // Operation selection
    component opEquals[3];
    signal opResults[3];
    signal opProducts[3];
    
    // Check which operation is selected
    for (var i = 0; i < 3; i++) {
        opEquals[i] = IsEqual();
        opEquals[i].in[0] <== op;
        opEquals[i].in[1] <== i;
    }
    
    // Map operation results
    opResults[0] <== isEq.out;        // op == 0: equality
    opResults[1] <== lessThan.out;    // op == 1: less than
    opResults[2] <== greaterThan.out; // op == 2: greater than
    
    // Select the correct operation result
    for (var i = 0; i < 3; i++) {
        opProducts[i] <== opResults[i] * opEquals[i].out;
    }
    
    // Sum to get final result
    result <== opProducts[0] + opProducts[1] + opProducts[2];
    
    // Constraint: op must be 0, 1, or 2
    signal validOp;
    validOp <== opEquals[0].out + opEquals[1].out + opEquals[2].out;
    //validOp === 1;  // Exactly one operation must be selected
    
    // Constraint: fieldIndex must be valid (0 to nFields-1)
    signal validIndex;
    validIndex <== isEqual[0] + isEqual[1] + isEqual[2] + isEqual[3] + isEqual[4] + isEqual[5];
    //validIndex === 1;  // Exactly one field must be selected
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

    /*
    component doComparison = FieldSelector(nFields);
    doComparison.fields <== fields;
    doComparison.fieldIndex <== fieldIndex;
    doComparison.op <== op;
    doComparison.value <== value;
    //doComparison.result === 1;
    */

    component secretHasher = Poseidon(1);
    secretHasher.inputs[0] <== secret;

    component encFields = EncryptFields(nFields);
    encFields.secret <== secret;
    encFields.fields <== fields;

    component leafHasher = SeqHasher(nFields);
    leafHasher.fields <== encFields.out;
    leafHasher.secretHash <== secretHasher.out;

    component imt = IncrementalMerkleTree(treeDepth);
    imt.root <== merkleRoot;
    imt.leaf <== leafHasher.out;
    imt.directionBits <== treeIndex;
    imt.branches <== treeProof;
    
    // Compute nullifier
    component rehasher = Poseidon(2);
    rehasher.inputs[0] <== contractAddr;
    rehasher.inputs[1] <== secret;
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== contractAddr;
    nullifierHasher.inputs[1] <== rehasher.out;
    signal output nullifier;
    nullifier <== nullifierHasher.out;
}

component main {public [contractAddr,merkleRoot,fieldIndex,op,value]} = AnonUserChecker(10,6);

pragma circom 2.0.0;

template AnonField() {
    signal input merkleRoot;
    signal input fieldIndex;
    signal input op;
    signal input value;
    c <== a*b;
}

component main {public [merkleRoot,]} = Multiply();

CIRCUIT_NAME = circuit-wasm-pom
NPM ?= pnpm

all: build contracts/Groth16Verifier.sol

build compile:
	$(NPM) hardhat compile

contracts/Groth16Verifier.sol: ../circuits/$(CIRCUIT_NAME)/build/circuit.ark-vk-json
	$(NPM) hardhat gen-verifier $< > $@

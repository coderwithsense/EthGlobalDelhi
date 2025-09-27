CIRCUIT_NAME = circuit-wasm-pom
NPM ?= pnpm

all: contracts/Groth16Verifier.sol build

build compile:
	$(NPM) hardhat compile

contracts/Groth16Verifier.sol: ../circuits/$(CIRCUIT_NAME)/build/circuit.ark-vk-json
	$(NPM) hardhat gen-verifier $< > $@

deploy-amoy:
	pnpm hardhat deploy --network polygon_amoy

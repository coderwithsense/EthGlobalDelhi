CWC_URL = https://github.com/HarryR/circom-witnesscalc.git
CWC_DIR = ../circom-witnesscalc
BUILD_CIRCUIT = $(CWC_DIR)/target/release/build-circuit
ARK_CWC_URL = https://github.com/HarryR/ark-circom-witnesscalc.git
ARK_CWC_DIR = ../ark-circom-witnesscalc
ARK_CWC_SETUP = $(ARK_CWC_DIR)/target/release/ark_cwc_setup
ARK_CWC_PROVE = $(ARK_CWC_DIR)/target/release/ark_cwc_prove

# Use --profiling to keep symbols
# NOTE: use --no-opt with wasm-pack,
#  - 'optimizing' for size makes things horribly slow
WASMPACK_FLAGS = --release --no-opt

PKG_NAME ?= circuit
CIRCUIT_NAME = circuit

all: deps compile-circuit trusted-setup wasm-pack wasm-pack-node rayon

.PRECIOUS: build/%.graph build/%.r1cs build/%.sym
build/%.graph build/%.r1cs build/%.sym: %.circom $(BUILD_CIRCUIT)
	mkdir -p build
	# XXX: note --O0, otherwise it breaks!
	$(BUILD_CIRCUIT) --O0 --r1cs build/$*.r1cs --sym build/$*.sym $< build/$*.graph

$(CWC_DIR):
	cd $(dir $@) && git checkout $(CWC_URL)

$(ARK_CWC_DIR):
	cd $(dir $@) && git checkout $(ARK_CWC_URL)

deps: dep-build-circuit dep-ark-cwc

.PHONY: dep-build-circuit
.PRECIOUS: $(BUILD_CIRCUIT)
$(BUILD_CIRCUIT) dep-build-circuit:
	cd $(CWC_DIR)/extensions/build-circuit && cargo build --release --all

.PHONY: dep-ark-cwc
.PRECIOUS: $(ARK_CWC_SETUP) $(ARK_CWC_PROVE)
$(ARK_CWC_SETUP) $(ARK_CWC_PROVE) dep-ark-cwc:
	cd $(ARK_CWC_DIR) && cargo build --release --all

compile-circuit: build/$(CIRCUIT_NAME).r1cs build/$(CIRCUIT_NAME).graph

trusted-setup: build/$(CIRCUIT_NAME).ark-pkey

src/lib.rs: Cargo.toml compile-circuit

.PRECIOUS: pkg-node/%.js
pkg-nodejs/$(PKG_NAME).js wasm-pack-node: src/lib.rs
	RUSTFLAGS='--cfg getrandom_backend="wasm_js"' wasm-pack build $(WASMPACK_FLAGS) --target nodejs --out-dir pkg-nodejs/ --out-name $(PKG_NAME)_nodejs
	sed -i 's/"name": "\([^"]*\)"/"name": "\1-nodejs"/' pkg-nodejs/package.json

.PRECIOUS: pkg/%.js
pkg/$(PKG_NAME).js wasm-pack: src/lib.rs
	RUSTFLAGS='--cfg getrandom_backend="wasm_js"' wasm-pack build $(WASMPACK_FLAGS) --target web
	# For debugging, you can build like this:
	# RUSTFLAGS="-C opt-level=1 -C debuginfo=2 -C force-frame-pointers=yes" wasm-pack build --dev --target web

.PRECIOUS: pkg-rayon/%.js
pkg-rayon/$(PKG_NAME)-rayon.js rayon:
	mkdir -p pkg-rayon/
	RUSTFLAGS='-C target-feature=+atomics,+bulk-memory --cfg getrandom_backend="wasm_js"' rustup run nightly wasm-pack build --out-dir pkg-rayon/ --out-name $(PKG_NAME)_rayon $(WASMPACK_FLAGS) --target web . -Z build-std=panic_abort,std -F rayon
	# Fix package name, append -rayon
	sed -i 's/"name": "\([^"]*\)"/"name": "\1-rayon"/' pkg-rayon/package.json

clean:
	rm -rf build pkg pkg-rayon target

distclean: clean
	rm -rf circom circomlib Cargo.lock node_modules

.PRECIOUS: build/%.ark-pkey build/%.ark-vk build/%.ark-vk-json
build/%.ark-pkey build/%.ark-vk: build/%.r1cs $(ARK_CWC_SETUP)
	$(ARK_CWC_SETUP) $< build/$*.ark-pkey build/$*.ark-vk build/$*.ark-vk-json

.PRECIOUS: build/%.ark-proof-json build/%.ark-proof-bin
build/%.ark-proof-json: %.input.json build/%.graph build/%.r1cs build/%.ark-pkey
	$(ARK_CWC_PROVE) $^ build/$*.ark-proof-json build/$*.ark-proof-bin

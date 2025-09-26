use wasm_bindgen::prelude::{wasm_bindgen};
use circom_prover::CircomProver;

#[cfg(all(target_arch = "wasm32", not(doc), target_feature = "atomics"))]
pub use wasm_bindgen_rayon::init_thread_pool;

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn process_string(inputs_data: &str) -> String {
    static PKEY_DATA: &[u8] = include_bytes!("../build/circuit.ark-pkey");
    static GRAPH_DATA: &[u8] = include_bytes!("../build/circuit.graph");
    static R1CS_DATA: &[u8] = include_bytes!("../build/circuit.r1cs");
    CircomProver::prove_to_json(&inputs_data, &PKEY_DATA, &GRAPH_DATA, &R1CS_DATA).unwrap()
}

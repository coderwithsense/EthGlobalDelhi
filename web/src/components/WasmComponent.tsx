"use client";

import { useEffect, useState } from "react";

export default function WasmComponent() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function initWasm() {
      try {
        // Wait a tick to ensure we're fully in browser
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Check if component is still mounted and we're in browser
        if (!isMounted || typeof window === "undefined") {
          return;
        }

        console.log("Initializing WASM...");

        // Dynamic import the WASM module
        const wasmModule = await import("../pkg/circuit_wasm_pom");

        // Initialize the WASM
        await wasmModule.default();

        console.log("WASM initialized, processing string...");

        // Process the string
        const hardcodedString = JSON.stringify({
          contractAddr: "12345",
          secret:
            "2964641453553456252210563257678564678848297593672258608343278215244640919290",
          merkleRoot:
            "14342888864344933717635669583993153920026910865546263675905107181851686064312",
          treeProof: [
            "858150129107533029555506722511675985769877160150929552477881692094053769112",
            "13037695437787841070778603288906624635112542593412910948845999535925896118024",
            "11749060597470796480618818813204510562102716785665095252417437809034628992763",
            "10920476169407261758833707571190596649853069417984185537149308508350401308282",
            "13744707676723387035686906006799979141670403177468451076432819075353414711890",
            "12947778431591865656613341560282152947336522733598787765933086415704803946460",
            "10711963735450051692521159135046059844200911410795447920859680295055020659913",
            "15774625577406699686036584955630258344585976004741465330319957904600592252864",
            "5654704069061272433226575399863955924428570799946513102752314872412709386669",
            "15717500456687409929068226849311572136212376339090976251005442972681467325812",
          ],
          treeIndex: 4,
          fields: ["100", "5", "200", "300", "400", "500"],
          value: "999999999",
          op: "2",
          fieldIndex: "1",
        });
        const processed = wasmModule.process_string(hardcodedString);

        if (isMounted) {
          setResult(processed);
          setLoading(false);
        }
      } catch (err) {
        console.error("WASM Error:", err);
        if (isMounted) {
          setError(`Error: ${err}`);
          setLoading(false);
        }
      }
    }

    initWasm();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">ZK Proof Page</h1>
        <p>Loading WASM module (client-side only)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">ZK Proof Page</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ZK Proof Page</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">
          Proof Result (Client-side):
        </h2>
        <p className="font-mono">{result}</p>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        ✅ This proof was generated entirely in your browser
      </div>
    </div>
  );
}

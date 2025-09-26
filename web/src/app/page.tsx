"use client";

import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import { useState } from "react";

export default function Home() {
  const [statusText, setStatusText] = useState(
    "Click the button to scan your NFC card."
  );

  // This function will request the public key from the card
  async function getCardPublicKey() {
    // We change the command to 'get_pubkey'
    // This asks the card for its public key from slot #1
    const command = {
      name: "get_pkeys",
      keyNo: 1,
    };

    setStatusText("Waiting for NFC card tap...");

    try {
      // --- request NFC command execution ---
      const res = await execHaloCmdWeb(command);

      // The command has succeeded, display the result to the user
      // JSON.stringify helps format the output nicely in the <pre> tag
      setStatusText(JSON.stringify(res, null, 4));
    } catch (e) {
      // The command has failed, display the error to the user
      setStatusText("Error: " + String(e));
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>NFC Card Info Retriever</h1>
        <p>Use this to get your card's public key.</p>

        {/* The <pre> tag is great for displaying formatted JSON */}
        <pre
          style={{
            fontSize: 14,
            textAlign: "left",
            backgroundColor: "#333",
            padding: "1em",
            borderRadius: "8px",
            width: "80%",
            wordBreak: "break-all",
          }}
        >
          {statusText}
        </pre>

        {/* The button now calls our new function */}
        <button onClick={getCardPublicKey}>Get Public Key from Card</button>
      </header>
    </div>
  );
}

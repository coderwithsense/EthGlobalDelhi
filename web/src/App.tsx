import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [statusText, setStatusText] = useState("Click on the button");

  async function btnClick() {
    let command = {
      name: "sign",
      keyNo: 1,
      message: "010203",
    };

    let res;

    try {
      // --- request NFC command execution ---
      res = await execHaloCmdWeb(command);
      // the command has succeeded, display the result to the user
      setStatusText(JSON.stringify(res, null, 4));
    } catch (e) {
      // the command has failed, display error to the user
      setStatusText("Error: " + String(e));
    }
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMRD???
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <div>
        <pre style={{ fontSize: 12, textAlign: "left" }}>{statusText}</pre>
        <button onClick={() => btnClick()}>
          Sign message 010203 using key #1
        </button>
      </div>
    </>
  );
}

export default App;

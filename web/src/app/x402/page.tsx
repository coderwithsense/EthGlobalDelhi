// "use client";

// import { useState } from "react";
// // import {
// //   makeX402PaymentWithNfc,
// //   getCardUSDCBalance,
// // } from "../../lib/nfcTx/nfcService";

// export default function WeatherApp() {
//   const [weather, setWeather] = useState(null);
//   const [balance, setBalance] = useState("0");
//   const [isLoading, setIsLoading] = useState(false);
//   const [serverStatus, setServerStatus] = useState("unknown");

//   // Test server connectivity
//   const testServer = async () => {
//     try {
//       setIsLoading(true);
//       const response = await fetch("http://localhost:4021/test");
//       if (response.ok) {
//         const data = await response.json();
//         setServerStatus("connected");
//         console.log("Server test:", data);
//         alert("Server is running! " + JSON.stringify(data));
//       } else {
//         setServerStatus("error");
//         alert("Server responded with error: " + response.status);
//       }
//     } catch (error) {
//       setServerStatus("disconnected");
//       console.error("Server test failed:", error);
//       alert("Cannot connect to server. Make sure it's running on port 4021");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Test 402 response without payment
//   const test402 = async () => {
//     try {
//       setIsLoading(true);
//       const response = await fetch("http://localhost:4021/weather");
//       console.log("Response status:", response.status);
//       console.log(
//         "Response headers:",
//         Object.fromEntries(response.headers.entries())
//       );

//       if (response.status === 402) {
//         const data = await response.text();
//         console.log("402 Response:", data);
//         alert("Got 402 Payment Required! " + data);
//       } else {
//         const data = await response.json();
//         alert("Unexpected response: " + JSON.stringify(data));
//       }
//     } catch (error: any) {
//       console.error("402 test failed:", error);
//       alert("Cannot test 402: " + error.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const checkBalance = async () => {
//     try {
//       setIsLoading(true);
//       const bal = await getCardUSDCBalance();
//       setBalance(bal);
//     } catch (error: any) {
//       console.error("Failed to check balance:", error);
//       alert("Balance check failed: " + error.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchWeatherWithNFC = async () => {
//     try {
//       setIsLoading(true);
//       const weatherData = await makeX402PaymentWithNfc(
//         "http://localhost:4021",
//         "/weather"
//       );
//       setWeather(weatherData);
//       alert("Weather fetched successfully!");
//     } catch (error: any) {
//       console.error("Failed to fetch weather:", error);
//       alert(`Payment failed: ${error.message}`);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div style={{ padding: "20px", fontFamily: "monospace" }}>
//       <h1>Weather App with NFC Payments</h1>

//       <div style={{ marginBottom: "20px" }}>
//         <p>
//           Server Status: <strong>{serverStatus}</strong>
//         </p>
//         <p>
//           USDC Balance: <strong>{balance} USDC</strong>
//         </p>
//       </div>

//       <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
//         <button onClick={testServer} disabled={isLoading}>
//           {isLoading ? "Testing..." : "Test Server Connection"}
//         </button>

//         <button onClick={test402} disabled={isLoading}>
//           {isLoading ? "Testing..." : "Test 402 Response"}
//         </button>

//         <button onClick={checkBalance} disabled={isLoading}>
//           {isLoading ? "Checking..." : "Check NFC Balance"}
//         </button>

//         <button onClick={fetchWeatherWithNFC} disabled={isLoading}>
//           {isLoading ? "Processing..." : "Get Weather (Pay with NFC)"}
//         </button>
//       </div>

//       {weather && (
//         <div style={{ marginTop: "20px" }}>
//           <h3>Weather Data:</h3>
//           <pre style={{ background: "#f0f0f0", padding: "10px" }}>
//             {JSON.stringify(weather, null, 2)}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// }

export default function Page() {
  return (
    <div className="p-8">
      X402 Tap and pay using polygon fasc, coming soon...
    </div>
  );
}

import express from "express";
import cors from "cors";
import { paymentMiddleware } from "x402-express";

const app = express();

// Get environment variables
const PORT = process.env.PORT || 4021;
const NODE_ENV = process.env.NODE_ENV || "development";

// Open CORS for everyone - Railway compatible
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow all origins (including no origin for mobile apps/Postman)
      callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Payment",
      "X-Accept-Payment",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "Pragma",
    ],
    credentials: true,
    exposedHeaders: ["X-Accept-Payment", "X-Payment-Response"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
);

// Add JSON parsing middleware
app.use(express.json());

// Railway health check endpoint (Railway expects this at root)
app.get("/", (req, res) => {
  res.json({
    status: "✅ X402 Weather Server Running",
    environment: NODE_ENV,
    timestamp: Date.now(),
    endpoints: {
      health: "/",
      test: "/test",
      weather: "/weather (protected by x402)",
    },
  });
});

// Enhanced logging for Railway
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log("Origin:", req.get("origin") || "No origin");
  console.log("User-Agent:", req.get("user-agent") || "No user-agent");
  next();
});

// X402 payment middleware
app.use(
  paymentMiddleware(
    "0x07E4E4991AcB95f555bBC4b17EB92D6587a415E3", // receiving wallet address
    {
      // Route configurations for protected endpoints
      "GET /weather": {
        // USDC amount in dollars
        price: "$0.001",
        network: "polygon-amoy",
        config: {
          description: "Get current weather data for any location",
          inputSchema: {
            type: "object",
            properties: {
              location: { type: "string", description: "City name" },
            },
          },
          outputSchema: {
            type: "object",
            properties: {
              weather: { type: "string" },
              temperature: { type: "number" },
            },
          },
        },
      },
    },
    {
      url: process.env.FACILITATOR_URL || "https://x402.polygon.technology", // Polygon Amoy facilitator
    }
  )
);

// Test endpoint without payment protection
app.get("/test", (req, res) => {
  res.json({
    message: "Server is running!",
    timestamp: Date.now(),
    method: req.method,
    headers: req.headers,
    cors: "✅ CORS enabled for all origins",
  });
});

// Implement your protected route
app.get("/weather", (req, res) => {
  console.log("Weather endpoint hit - this should be protected by x402");
  res.json({
    report: {
      weather: "sunny",
      temperature: 70,
      location: "Test City",
      timestamp: Date.now(),
      requestId: Math.random().toString(36).substring(7),
    },
  });
});

// Handle 404 for undefined routes (Railway compatible)
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
    availableEndpoints: ["/", "/test", "/weather"],
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: err.message,
    stack: NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Railway uses dynamic port assignment
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Health check: GET /`);
  console.log(`Test endpoint: GET /test`);
  console.log(`Protected endpoint: GET /weather`);
  console.log(`🌐 CORS: Open for all origins`);
});

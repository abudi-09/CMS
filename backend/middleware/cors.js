 // CORS middleware for Express
import cors from "cors";

const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
];
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

export default cors(corsOptions);

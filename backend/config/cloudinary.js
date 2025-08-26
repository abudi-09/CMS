import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Try to ensure env vars are actually loaded, even if .env placed in backend/ instead of project root.
function ensureEnvLoaded() {
  if (process.env.CLOUDINARY_CLOUD_NAME) return; // already loaded by server.js
  // Try root .env
  const rootEnv = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
  // If still not set, try backend/.env
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    const backendEnv = path.resolve(process.cwd(), "backend", ".env");
    if (fs.existsSync(backendEnv))
      dotenv.config({ path: backendEnv, override: true });
  }
}

ensureEnvLoaded();

// Allow using frontend-style VITE_ variable names at root to avoid duplication.
const raw = {
  cloud:
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.VITE_CLOUDINARY_CLOUD_NAME ||
    "",
  key:
    process.env.CLOUDINARY_API_KEY ||
    process.env.VITE_CLOUDINARY_API_KEY ||
    "",
  secret:
    process.env.CLOUDINARY_API_SECRET ||
    process.env.VITE_CLOUDINARY_API_SECRET ||
    "",
};

const cloudName = raw.cloud.trim();
const apiKey = raw.key.trim();
const apiSecret = raw.secret.trim();

const haveAny = cloudName || apiKey || apiSecret;
const haveAll = cloudName && apiKey && apiSecret;

if (haveAll) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  console.log(
    `[cloudinary] configured cloud='${cloudName}' key='${apiKey.slice(
      0,
      4
    )}***'`
  );
} else if (haveAny) {
  console.warn(
    `[cloudinary] Partial credentials detected. cloud='${
      cloudName || "<missing>"
    }' api_key='${apiKey ? apiKey.slice(0, 4) + "***" : "<missing>"}' secret='${
      apiSecret ? "***set***" : "<missing>"
    }'. Cloud uploads will FAIL until all three are set.`
  );
} else {
  console.warn(
    "[cloudinary] No credentials found. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to enable cloud uploads. Falling back to local storage."
  );
}

export const cloudinaryReady = () => haveAll;
// Unsigned preset: prefer backend var, fallback to VITE_ one.
export const cloudinaryUnsignedPreset = (
  process.env.CLOUDINARY_UPLOAD_PRESET ||
  process.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
  ""
).trim();
export default cloudinary;

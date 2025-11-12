import Constants from "expo-constants";

// Load environment variables from Expo config
const {
  GEMINI_API_KEY: ENV_GEMINI_API_KEY,
  AWS_REGION: ENV_AWS_REGION,
  AWS_S3_BUCKET: ENV_AWS_S3_BUCKET,
  AWS_IDENTITY_POOL_ID: ENV_AWS_IDENTITY_POOL_ID,
  MUSE_REFERENCE_IMAGE_URL: ENV_MUSE_REFERENCE_IMAGE_URL,
  REMOVE_BG_API_KEY: ENV_REMOVE_BG_API_KEY,
} = Constants.expoConfig?.extra ?? {};

// --- API Keys ---
export const GEMINI_API_KEY = ENV_GEMINI_API_KEY || "";
export const REMOVE_BG_API_KEY = ENV_REMOVE_BG_API_KEY || "";

// --- AWS Config ---
export const AWS_REGION = ENV_AWS_REGION || "us-east-2";
export const AWS_S3_BUCKET = ENV_AWS_S3_BUCKET || "muse-app-uploads";
export const AWS_IDENTITY_POOL_ID = ENV_AWS_IDENTITY_POOL_ID || "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";

// --- Muse Config ---
export const MUSE_REFERENCE_IMAGE = ENV_MUSE_REFERENCE_IMAGE_URL || "https://muse-app-uploads.s3.us-east-2.amazonaws.com/MuseStorage/Streetwear.png";

// --- Error checking ---
if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set in your .env file.");
}
if (!REMOVE_BG_API_KEY) {
  console.warn("REMOVE_BG_API_KEY is not set in your .env file. Generated graphics will keep their original background.");
}

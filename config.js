// API Base URL Configuration
// For EAS builds (APK/AAB), this MUST be a public URL (HTTPS recommended)
// Environment variable takes precedence (set in eas.json for builds)

// Priority: EXPO_PUBLIC_API_URL env var > production URL > local dev URL
const getApiBaseUrl = () => {
  // Check for environment variable (set in eas.json for builds)
  // This will be used in EAS builds (APK/AAB)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // For production/deployed backend URL
  // ⚠️ IMPORTANT: Update this with your actual production backend URL before building APK
  // Examples:
  // - Deployed backend: "https://api.ezsakay.com"
  // - Ngrok tunnel: "https://your-ngrok-url.ngrok-free.dev"
  // - Other hosting: "https://your-backend-url.com"
  const PRODUCTION_URL = "https://considerate-overappreciatively-melodee.ngrok-free.dev";
  
  // For local development with Expo Go, use your computer's local IP
  // Find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
  const LOCAL_DEV_URL = "http://192.168.41.109:8000";
  
  // For local development with Expo Go, use LOCAL_DEV_URL.
  // For EAS builds, EXPO_PUBLIC_API_URL from eas.json will override this.
  // Switch to PRODUCTION_URL when deploying with a live backend.
  return LOCAL_DEV_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Supabase Configuration
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://vsevigwdjpdgqwsogenv.supabase.co";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
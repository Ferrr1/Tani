import type { ExpoConfig } from "@expo/config";
import "dotenv/config";

const config: ExpoConfig = {
  name: "Tani",
  slug: "tani",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "tani",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/logo.png",
      backgroundColor: "#ffffffff",
    },
    edgeToEdgeEnabled: true,
    package: "com.fersetya.tani",
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "" },
    },
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/logo.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/logo.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffffff",
      },
    ],
  ],

  experiments: { typedRoutes: true },

  extra: {
    eas: {
      projectId: "",
    },
    SUPABASE_URL:
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    SUPABASE_ANON_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      "",
  },
};

export default config;

import type { ExpoConfig } from "@expo/config";
import "dotenv/config";

const config: ExpoConfig = {
  name: "Tani",
  slug: "tani",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/logo-bg.png",
  scheme: "tani",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Aplikasi butuh akses lokasi untuk menampilkan cuaca di sekitar Anda.",
    },
    supportsTablet: true,
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/logo-bg.png",
      backgroundColor: "#FFFFFF",
    },
    edgeToEdgeEnabled: true,
    package: "com.fersetya.tani",
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
        backgroundColor: "#FFFFFF",
      },
    ],
  ],

  experiments: { typedRoutes: true },

  extra: {
    eas: {
      projectId: "7eee7067-17a8-424f-ac84-5f330582810c",
    },
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  updates: {
    url: "https://u.expo.dev/7eee7067-17a8-424f-ac84-5f330582810c",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
};

export default config;

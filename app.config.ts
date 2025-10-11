import type { ExpoConfig } from "@expo/config";
import "dotenv/config";

const config: ExpoConfig = {
  name: "Lamban Sayur",
  slug: "lambansayur",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/logo-bg.png",
  scheme: "lambansayur",
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
      backgroundColor: "#FFFFE7",
    },
    edgeToEdgeEnabled: true,
    package: "com.fersetya.lambansayur",
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
        backgroundColor: "#FFFFE7",
      },
    ],
  ],

  experiments: { typedRoutes: true },

  extra: {
    eas: {
      projectId: "241ce323-4316-4a7d-86e9-015e4e9be9a0",
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

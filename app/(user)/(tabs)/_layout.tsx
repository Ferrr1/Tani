// app/(user)/(tabs)/_layout.tsx
import { HapticTab } from "@/components/haptic-tab";
import LoadingScreen from "@/components/LoadingScreen";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router, Tabs, useRootNavigationState } from "expo-router";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function TabLayout() {
  const scheme = useColorScheme();
  const navReady = !!useRootNavigationState()?.key;
  const { authReady, session, role } = useAuth();

  useEffect(() => {
    if (!navReady || !authReady) return;

    if (!session) {
      router.replace("/(auth)");
    } else if (role === "superadmin") {
      router.replace("/(superadmin)/(tabs)");
    } else if (role === "admin") {
      router.replace("/(admin)/(tabs)");
    }
  }, [navReady, authReady, session, role]);

  if (!navReady || !authReady) {
    return (
      <LoadingScreen
        title="Menyiapkan navigasi"
        subtitle="Memuat sesi pengguna…"
      />
    );
  }
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[scheme ?? "light"].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Ionicons size={28} name="home-outline" color={color} /> }} />
        <Tabs.Screen name="income" options={{ title: "Penerimaan", tabBarIcon: ({ color }) => <Ionicons size={28} name="arrow-down-circle-outline" color={color} /> }} />
        <Tabs.Screen name="expense" options={{ title: "Pengeluaran", tabBarIcon: ({ color }) => <Ionicons size={28} name="arrow-up-circle-outline" color={color} /> }} />
        <Tabs.Screen name="chart" options={{ title: "Grafik", tabBarIcon: ({ color }) => <Ionicons size={28} name="stats-chart-outline" color={color} /> }} />
        <Tabs.Screen name="report" options={{ title: "Laporan", tabBarIcon: ({ color }) => <Ionicons size={28} name="document-text-outline" color={color} /> }} />
      </Tabs>
    </SafeAreaProvider>
  );
}

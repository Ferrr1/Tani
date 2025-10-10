// app/(user)/(tabs)/_layout.tsx
import { HapticTab } from "@/components/haptic-tab";
import LoadingScreen from "@/components/LoadingScreen";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRootNavigationState } from "expo-router";
import React from "react";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const scheme = useColorScheme();
  const navReady = !!useRootNavigationState()?.key;
  const { authReady, session, role } = useAuth();

  if (!navReady || !authReady) {
    return <LoadingScreen title="Menyiapkan navigasi" subtitle="Memuat sesi pengguna…" />;
  }
  if (!session) return <Redirect href="/(auth)" />;
  if (role === "superadmin") return <Redirect href="/(superadmin)/(tabs)" />;
  if (role === "admin") return <Redirect href="/(admin)/(tabs)" />;

  return (
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
  );
}

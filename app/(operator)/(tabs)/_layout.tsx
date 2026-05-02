import { HapticTab } from "@/components/haptic-tab";
import LoadingScreen from "@/components/LoadingScreen";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, Tabs, useRootNavigationState } from "expo-router";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";

const OperatorLayout = () => {
  const scheme = useColorScheme() ?? "light";
  const navReady = !!useRootNavigationState()?.key;
  const { isInitialized, session, role } = useAuth();

  useEffect(() => {
    if (!navReady || !isInitialized || !session) return;
    if (role !== "operator") {
      router.replace("/(user)/(tabs)");
    }
  }, [session, role, navReady, isInitialized]);

  if (!navReady || !isInitialized) {
    return (
      <LoadingScreen
        title="Menyiapkan panel operator"
        subtitle="Memuat profil & sesi…"
      />
    );
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Colors[scheme].tint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons size={26} name="home-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="information"
        options={{
          title: "Informasi",
          tabBarIcon: ({ color }) => (
            <Ionicons
              size={26}
              name="information-circle-outline"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default OperatorLayout;

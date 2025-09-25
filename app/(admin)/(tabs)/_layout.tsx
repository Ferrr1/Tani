// app/(admin)/(tabs)/_layout.tsx
import { HapticTab } from "@/components/haptic-tab";
import LoadingScreen from "@/components/LoadingScreen";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRootNavigationState } from "expo-router";
import React from "react";
import { useColorScheme } from "react-native";

const AdminLayout = () => {
    const scheme = useColorScheme();
    const navReady = !!useRootNavigationState()?.key;
    const { authReady, session, role } = useAuth();

    if (!navReady || !authReady) {
        return <LoadingScreen title="Menyiapkan panel admin" subtitle="Memuat sesi & navigasi…" />;
    }
    if (!session) return <Redirect href="/(auth)" />;
    if (role !== "admin") return <Redirect href="/(user)/(tabs)" />;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[scheme ?? "light"].tint,
                headerShown: false,
                tabBarButton: HapticTab,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => <Ionicons size={28} name="home-outline" color={color} />,
                }}
            />
            <Tabs.Screen
                name="information"
                options={{
                    title: "Informasi",
                    tabBarIcon: ({ color }) => <Ionicons size={28} name="information-circle" color={color} />,
                }}
            />
        </Tabs>
    );
};

export default AdminLayout;

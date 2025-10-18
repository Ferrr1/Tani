// app/(admin)/(tabs)/_layout.tsx
import { HapticTab } from "@/components/haptic-tab";
import LoadingScreen from "@/components/LoadingScreen";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router, Tabs, useRootNavigationState } from "expo-router";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";

const AdminLayout = () => {
    const scheme = useColorScheme();
    const navReady = !!useRootNavigationState()?.key;
    const { authReady, session, role } = useAuth();

    useEffect(() => {
        if (!navReady || !authReady) return;
        if (!session) {
            router.replace("/(auth)");
        } else if (role !== "admin") {
            router.replace("/(user)/(tabs)");
        }
    }, [session, role, navReady, authReady]);

    if (!navReady || !authReady) {
        return <LoadingScreen title="Menyiapkan panel admin" subtitle="Memuat sesi & navigasi…" />;
    }
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

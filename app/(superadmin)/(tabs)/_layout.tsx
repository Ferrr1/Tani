import { HapticTab } from "@/components/haptic-tab";
import LoadingScreen from "@/components/LoadingScreen";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router, Tabs, useRootNavigationState } from "expo-router";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";

const SuperadminLayout = () => {
    const scheme = useColorScheme() ?? "light";
    const navReady = !!useRootNavigationState()?.key;
    const { authReady, session, role } = useAuth();

    useEffect(() => {
        if (!session) {
            router.replace("/(auth)");
        } else if (role !== "superadmin") {
            router.replace("/(user)/(tabs)");
        }

    }, [session, role]);

    if (!navReady || !authReady) {
        return (
            <LoadingScreen
                title="Menyiapkan panel superadmin"
                subtitle="Memuat sesi & navigasi…"
            />
        );
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
                        <Ionicons size={26} name="information-circle-outline" color={color} />
                    ),
                }}
            />

        </Tabs>
    );
};

export default SuperadminLayout;

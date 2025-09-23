import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRootNavigationState } from "expo-router";
import { useColorScheme } from "react-native";

const AdminLayout = () => {
    const colorScheme = useColorScheme();
    const navReady = !!useRootNavigationState()?.key;
    const { authReady, session, profileReady, role } = useAuth();
    if (!navReady || !authReady) return null;
    if (!session) return <Redirect href="/(auth)" />;
    if (!profileReady) return null;
    if (role !== "admin") return <Redirect href="/(user)/(tabs)" />;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarButton: HapticTab,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Ionicons size={28} name="home-outline" color={color} />,
                }}
            />
            <Tabs.Screen
                name="information"
                options={{
                    title: 'Informasi',
                    tabBarIcon: ({ color }) => <Ionicons size={28} name="information-circle" color={color} />,
                }}
            />
        </Tabs>
    );
};

export default AdminLayout;
import { useAuth } from "@/context/AuthContext";
import { Redirect, Stack, useRootNavigationState } from "expo-router";

const AdminLayout = () => {
    const navReady = !!useRootNavigationState()?.key;
    const { authReady, session, profileReady, role } = useAuth();
    if (!navReady || !authReady) return null;
    if (!session) return <Redirect href="/(auth)" />;
    if (!profileReady) return null;
    if (role !== "admin") return <Redirect href="/(tabs)" />;

    return <Stack screenOptions={{ headerShown: false }} />;
};

export default AdminLayout;
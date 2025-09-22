import { useAuth } from "@/context/AuthContext";
import { STACK_ANIM } from "@/navigation/stackAnim";
import { Redirect, Stack, useRootNavigationState } from "expo-router";

const AdminLayout = () => {
    const navReady = !!useRootNavigationState()?.key;
    const { authReady, session, profileReady, role } = useAuth();
    if (!navReady || !authReady) return null;
    if (!session) return <Redirect href="/(auth)" />;
    if (!profileReady) return null;
    if (role !== "admin") return <Redirect href="/(tabs)" />;

    return <Stack screenOptions={STACK_ANIM} />;
};

export default AdminLayout;
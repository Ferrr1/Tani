import { useAuth } from "@/context/AuthContext";
import { Redirect, SplashScreen, Stack, useRootNavigationState } from "expo-router";
import { useEffect } from "react";

const AuthLayout = () => {
    const navReady = !!useRootNavigationState()?.key;
    const { authReady, session, profileReady, role } = useAuth();

    const deciding = !navReady || !authReady || (session && !profileReady);

    useEffect(() => {
        if (!deciding) {
            SplashScreen.hideAsync().catch(() => { });
        }
    }, [deciding]);

    if (deciding) return null;

    if (session) {
        return <Redirect href={role === "admin" ? "/(admin)" : "/(tabs)"} />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
};

export default AuthLayout;

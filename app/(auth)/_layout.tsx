import { useAuth } from "@/context/AuthContext";
import { STACK_ANIM } from "@/navigation/stackAnim";
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
        return <Redirect href={role === "admin" ? "/(admin)/(tabs)" : "/(tabs)"} />;
    }

    return <Stack screenOptions={STACK_ANIM} />;
};

export default AuthLayout;

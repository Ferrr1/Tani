import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "expo-router";
import React, { JSX, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";

function Loading() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    return (
        <View style={{ backgroundColor: C.background, flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={C.tint} size={"large"} />
        </View>
    );
}

export default function RoleGate({ children }: { children: React.ReactNode }): JSX.Element | null {
    const router = useRouter();
    const pathname = usePathname();

    const {
        booting,
        session,
        profile,
        role,
        isAdmin,
    } = useAuth();

    const isReady = useMemo(() => {
        if (booting) return false;
        if (!session) return true;
        return !!profile && !!role;
    }, [booting, session, profile, role]);

    const redirected = useRef(false);
    const sessionId = session?.user?.id ?? null;

    useEffect(() => {
        if (!session || pathname?.startsWith("/(auth)")) {
            redirected.current = false;
        }
    }, [session, pathname]);

    useEffect(() => {
        if (!isReady || redirected.current) return;

        if (!session) return;

        if (!role) return;

        const target = isAdmin ? "/(admin)" : "/(tabs)";
        const alreadyInTarget = pathname?.startsWith(target) ?? false;

        if (!alreadyInTarget) {
            redirected.current = true;
            router.replace(target);
        }
    }, [isReady, session, sessionId, role, isAdmin, pathname, router]);

    // jalur pengecualian: biarkan halaman di dalam (auth) lewat tanpa guard penuh
    if (pathname?.startsWith("/(auth)")) {
        return isReady ? <>{children}</> : <Loading />;
    }

    // halaman lain (non-auth) dijaga
    return isReady ? <>{children}</> : <Loading />;
}

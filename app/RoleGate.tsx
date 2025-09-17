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
        booting,      // bootstrap awal (restore session)
        session,
        profile,
        role,
        isAdmin,
    } = useAuth();

    /**
     * Kapan “siap”?
     * - Saat bootstrapping selesai (booting === false), DAN:
     *   - kalau BELUM login (session null): langsung siap
     *   - kalau SUDAH login: tunggu profile/role terbaca
     */
    const isReady = useMemo(() => {
        if (booting) return false;        // masih init
        if (!session) return true;        // stack (auth) boleh jalan
        return !!profile && !!role;       // butuh profile/role sebelum guard non-auth
    }, [booting, session, profile, role]);

    // cegah replace berkali-kali
    const redirected = useRef(false);
    const sessionId = session?.user?.id ?? null;

    // reset flag redirect saat ke stack auth atau saat user logout
    useEffect(() => {
        if (!session || pathname?.startsWith("/(auth)")) {
            redirected.current = false;
        }
    }, [session, pathname]);

    // redirect ke target sesuai role
    useEffect(() => {
        if (!isReady || redirected.current) return;

        // belum login → biarkan stack (auth) mengalir
        if (!session) return;

        // sudah login, pastikan role ada
        if (!role) return;

        const target = isAdmin ? "/(admin)" : "/(tabs)";
        const alreadyInTarget = pathname?.startsWith(target) ?? false;

        // kalau bukan di target, arahkan
        if (!alreadyInTarget) {
            redirected.current = true;
            router.push(target);
        }
    }, [isReady, session, sessionId, role, isAdmin, pathname, router]);

    // jalur pengecualian: biarkan halaman di dalam (auth) lewat tanpa guard penuh
    if (pathname?.startsWith("/(auth)")) {
        return isReady ? <>{children}</> : <Loading />;
    }

    // halaman lain (non-auth) dijaga
    return isReady ? <>{children}</> : <Loading />;
}

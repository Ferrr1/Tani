// app/(auth)/_layout.tsx
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { STACK_ANIM } from "@/navigation/stackAnim";
import { Redirect, Stack, usePathname, useRootNavigationState } from "expo-router";
import { useMemo } from "react";

const AuthLayout = () => {
    const navState = useRootNavigationState();
    const navReady = !!navState?.key;

    const pathname = usePathname() || "";
    const isRecoveryRoute = useMemo(() => pathname.includes("/reset-password"), [pathname]);

    const { isInitialized, session, role } = useAuth();

    // 1) Saat nav/auth belum siap → tampilkan UI loading
    if (!navReady || !isInitialized) {
        return <LoadingScreen title="Menyiapkan aplikasi" subtitle="Memuat navigasi & sesi pengguna…" />;
    }

    // 2) Recovery route selalu boleh tampil
    if (isRecoveryRoute) {
        return <Stack screenOptions={STACK_ANIM} />;
    }

    // 3) Session + profil siap → redirect berdasar role
    if (session) {
        if (role === "superadmin") return <Redirect href="/(superadmin)/(tabs)" />;
        if (role === "admin") return <Redirect href="/(admin)/(tabs)" />;
        return <Redirect href="/(user)/(tabs)" />;
    }

    // 4) Tidak ada session → render stack auth
    return <Stack screenOptions={STACK_ANIM} />;
};

export default AuthLayout;

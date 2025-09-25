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

    const { authReady, session, profileReady, role } = useAuth();

    // 1) Saat nav/auth belum siap → tampilkan UI loading (bukan splash)
    if (!navReady || !authReady) {
        return <LoadingScreen title="Menyiapkan aplikasi" subtitle="Memuat navigasi & sesi pengguna…" />;
    }

    // 2) Recovery route selalu boleh tampil (tanpa nunggu profil)
    if (isRecoveryRoute) {
        return <Stack screenOptions={STACK_ANIM} />;
    }

    // 3) Session ada tapi profil belum siap → tampilkan UI loading
    if (session && !profileReady) {
        return <LoadingScreen title="Sinkronisasi profil" subtitle="Mengambil data akun & peran…" />;
    }

    // 4) Session + profil siap → redirect berdasar role
    if (session && profileReady) {
        return <Redirect href={role === "admin" ? "/(admin)/(tabs)" : "/(user)/(tabs)"} />;
    }

    // 5) Tidak ada session → render stack auth
    return <Stack screenOptions={STACK_ANIM} />;
};

export default AuthLayout;

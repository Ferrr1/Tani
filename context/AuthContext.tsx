// src/context/AuthContext.tsx
import { supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/types/profile";
import type { Session, User } from "@supabase/supabase-js";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

/** Bentuk state Auth global */
type AuthState = {
    /** True saat bootstrap awal / aksi auth berjalan */
    loading: boolean;
    /** True hanya saat bootstrap awal, cocok buat skeleton global */
    booting: boolean;

    session: Session | null;
    user: User | null;
    profile: Profile | null;
    role: Role | null;
    isAdmin: boolean;

    // === Actions ===
    /** Sign up email/password (tanpa OTP confirm) */
    signUp: (params: { email: string; password: string; meta?: Partial<Profile> }) => Promise<void>;
    /** Sign in email/password */
    signIn: (params: { email: string; password: string }) => Promise<void>;
    /** Kirim email reset password */
    sendPasswordReset: (email: string) => Promise<void>;
    /** Logout */
    signOut: () => Promise<void>;
    /** Refresh profil dari DB */
    refreshProfile: () => Promise<void>;

    /** 🔹 Update profil milik user sendiri */
    updateProfile: (patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "jenis_tanaman" | "luas_lahan">>) => Promise<void>;
    /** 🔹 Ganti password sendiri (tanpa konfirmasi) */
    changePassword: (newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [booting, setBooting] = useState(true);
    const [loading, setLoading] = useState(true);

    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    const initializing = useRef(true);

    const role: Role | null = profile?.role ?? null;
    const isAdmin = role === "admin";

    const fetchProfile = useCallback(async (u?: User | null) => {
        const current = u ?? (await supabase.auth.getUser()).data.user;
        if (!current) {
            setProfile(null);
            return;
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("id, email, full_name, nama_desa, jenis_tanaman, luas_lahan, role")
            .eq("id", current.id)
            .maybeSingle();

        if (error) throw error;
        setProfile((data as Profile) ?? null);
    }, []);

    const bootstrap = useCallback(async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;

            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);

            if (data.session?.user) {
                await fetchProfile(data.session.user);
            } else {
                setProfile(null);
            }
        } finally {
            setLoading(false); // selesai tahap bootstrap utama
            setBooting(false);
            initializing.current = false;
        }
    }, [fetchProfile]);

    useEffect(() => {
        // Bootstrap awal
        bootstrap();

        // Sinkronkan perubahan session dari Supabase
        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
                try {
                    await fetchProfile(newSession.user);
                } catch {
                    // swallow
                }
            } else {
                setProfile(null);
            }

            if (!initializing.current) setLoading(false);
        });

        return () => {
            sub.subscription.unsubscribe();
        };
    }, [bootstrap, fetchProfile]);

    // === Actions ===
    const signUp = useCallback(
        async ({ email, password, meta }: { email: string; password: string; meta?: Partial<Profile> }) => {
            setLoading(true);
            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: meta ?? {}, // raw_user_meta_data -> bisa dipakai trigger untuk isi tabel profiles
                    },
                });
                if (error) throw error;

                // Jika signUp langsung mengembalikan session (tergantung setting email confirm), set state.
                if (data.session?.user) {
                    setSession(data.session);
                    setUser(data.session.user);
                    await fetchProfile(data.session.user);
                }
            } finally {
                setLoading(false);
            }
        },
        [fetchProfile]
    );

    const signIn = useCallback(
        async ({ email, password }: { email: string; password: string }) => {
            setLoading(true);
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                setSession(data.session!);
                setUser(data.session!.user);
                await fetchProfile(data.session!.user);
            } finally {
                setLoading(false);
            }
        },
        [fetchProfile]
    );

    const sendPasswordReset = useCallback(async (email: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                // Untuk RN, gunakan deep link kustom app kamu (schema di app.config.ts -> android.intentFilters/ios)
                redirectTo: "attendance://reset-password",
            });
            if (error) throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            setSession(null);
            setUser(null);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        setLoading(true);
        try {
            await fetchProfile(user);
        } finally {
            setLoading(false);
        }
    }, [fetchProfile, user]);

    /** 🔹 Update profil milik user sendiri */
    const updateProfile = useCallback(async (patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "jenis_tanaman" | "luas_lahan">>) => {
        if (!user?.id) throw new Error("Not authenticated");
        setLoading(true);
        try {
            // Normalisasi field
            const body: Record<string, any> = { ...patch };
            if ("luas_lahan" in body) {
                const n = Number(body.luas_lahan);
                body.luas_lahan = Number.isFinite(n) && n >= 0 ? n : null;
            }
            ["full_name", "nama_desa", "jenis_tanaman"].forEach((k) => {
                if (k in body) {
                    const v = body[k];
                    body[k] = (v ?? "").toString().trim() || null;
                }
            });

            const { data, error } = await supabase
                .from("profiles")
                .update(body)
                .eq("id", user.id)
                .select("id, email, full_name, nama_desa, jenis_tanaman, luas_lahan, role")
                .single();

            if (error) throw error;
            setProfile(data as Profile);
        } finally {
            setLoading(false);
        }
    }, [user]);

    /** 🔹 Ganti password sendiri (langsung berlaku, tanpa konfirmasi) */
    const changePassword = useCallback(async (newPassword: string) => {
        if (!newPassword || newPassword.length < 6) {
            throw new Error("Password minimal 6 karakter");
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const value = useMemo<AuthState>(
        () => ({
            loading,
            booting,
            session,
            user,
            profile,
            role,
            isAdmin,
            signUp,
            signIn,
            sendPasswordReset,
            signOut,
            refreshProfile,
            updateProfile,
            changePassword,
        }),
        [
            loading,
            booting,
            session,
            user,
            profile,
            role,
            isAdmin,
            signUp,
            signIn,
            sendPasswordReset,
            signOut,
            refreshProfile,
            updateProfile,
            changePassword,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

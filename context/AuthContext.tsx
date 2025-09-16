// src/context/AuthContext.tsx
import { supabase } from "@/lib/supabase";
import {
    changeMyPassword,
    getMyProfile,
    updateMyProfile,
} from "@/services/profileService";
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

type AuthState = {
    loading: boolean;
    booting: boolean;

    session: Session | null;
    user: User | null;
    profile: Profile | null;
    role: Role | null;
    isAdmin: boolean;

    signUp: (params: { email: string; password: string; meta?: Partial<Profile> }) => Promise<void>;
    signIn: (params: { email: string; password: string }) => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;

    updateProfile: (
        patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "jenis_tanaman" | "luas_lahan">>
    ) => Promise<void>;
    changePassword: (newPassword: string) => Promise<void>;
    // changeEmail?: (newEmail: string) => Promise<void>;
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
        // ✅ Ambil via service (RLS aman; hanya tabel public.profiles)
        const p = await getMyProfile();
        setProfile(p);
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
            setLoading(false);
            setBooting(false);
            initializing.current = false;
        }
    }, [fetchProfile]);

    useEffect(() => {
        bootstrap();

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
                    options: { data: meta ?? {} },
                });
                if (error) throw error;

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
            const p = await getMyProfile();
            setProfile(p);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateProfile = useCallback(
        async (patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "jenis_tanaman" | "luas_lahan">>) => {
            setLoading(true);
            try {
                const updated = await updateMyProfile(patch);
                setProfile(updated);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const changePassword = useCallback(async (newPassword: string) => {
        setLoading(true);
        try {
            await changeMyPassword(newPassword);
        } finally {
            setLoading(false);
        }
    }, []);

    // Optional kalau mau expose ganti email dari Context:
    // const changeEmail = useCallback(async (newEmail: string) => {
    //   setLoading(true);
    //   try {
    //     await changeMyEmail(newEmail);
    //     await refreshProfile();
    //   } finally {
    //     setLoading(false);
    //   }
    // }, [refreshProfile]);

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
            // changeEmail,
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
            // changeEmail,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

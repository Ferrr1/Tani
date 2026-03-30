import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthTokenResponsePassword, Session, User } from "@supabase/supabase-js";
import { FunctionsHttpError } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { toNum } from "@/utils/number";
import { getMyProfile, updateMyProfile } from "@/services/profileService";
import type { Profile, RegisterForm, Role } from "@/types/profile";

const REMEMBER_KEY = "auth:remember";
const PENDING_ANSWER = "auth:pending_mother_name";
const PENDING_PROFILE = "auth:pending_profile_patch";
const TAG = "[Auth]";

export type AuthState = {
    session: Session | null;
    user: User | null;

    authReady: boolean;
    isInitialized: boolean;
    profile: Profile | null;
    profileReady: boolean;
    role: Role | null;

    register: (form: RegisterForm, remember?: boolean) => Promise<void>;

    signIn: (email: string, password: string, remember?: boolean) => Promise<AuthTokenResponsePassword>;
    signOut: () => Promise<void>;
    reloadProfile: () => Promise<void>;
    updateProfile: (patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "luas_lahan">>) => Promise<void>;

    deleteSelf: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [authReady, setAuthReady] = useState(false);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileReady, setProfileReady] = useState(false);

    const profileLoadingRef = useRef<string | null>(null);
    const bootstrapDoneRef = useRef(false);

    /** Initialize session and sync with persistence flags */
    useEffect(() => {
        let alive = true;

        // 1. Register listener FIRST but gate it behind bootstrapDoneRef
        //    so INITIAL_SESSION and bootstrap-caused SIGNED_OUT are ignored.
        const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
            if (!bootstrapDoneRef.current) {
                console.log(TAG, "Ignoring pre-bootstrap event:", event);
                return;
            }

            console.log(TAG, "Auth state change:", event);
            setSession(sess);

            if (event === "SIGNED_OUT") {
                setProfile(null);
                setProfileReady(false);
            }
        });

        // 2. Bootstrap: determine the definitive initial session
        const bootstrap = async () => {
            try {
                const remember = await AsyncStorage.getItem(REMEMBER_KEY);

                // If not in "remember" mode, sign out first
                if (remember !== "1") {
                    await supabase.auth.signOut().catch(() => {});
                }

                // Fetch the final session state after potential signOut
                const { data } = await supabase.auth.getSession();
                if (alive) {
                    setSession(data.session);
                }
            } catch (e: any) {
                console.error(TAG, "Bootstrap error:", e?.message);
            } finally {
                if (alive) {
                    // Mark bootstrap complete BEFORE setting authReady
                    // so subsequent listener events are processed normally
                    bootstrapDoneRef.current = true;
                    setAuthReady(true);
                }
            }
        };

        bootstrap();

        return () => {
            alive = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const isInitialized = useMemo(() => {
        // 1. Must have checked for session at least once
        if (!authReady) return false;

        // 2. If no session exists, we're initialized (at login/auth)
        if (!session) return true;

        // 3. If session exists, we're only initialized once profile is fetched
        return profileReady;
    }, [authReady, session, profileReady]);

    /** Load profile whenever session user changes */
    useEffect(() => {
        const userId = session?.user?.id;
        if (!userId) {
            setProfile(null);
            // Don't touch profileReady here — isInitialized handles
            // the no-session case via the !session short-circuit
            return;
        }

        // Prevent redundant loads for same user
        if (profileLoadingRef.current === userId) return;
        profileLoadingRef.current = userId;

        let alive = true;
        const load = async () => {
            setProfileReady(false);
            try {
                const p = await getMyProfile(userId);
                if (alive) setProfile(p);
            } catch (e: any) {
                console.error(TAG, "loadProfile error:", e?.message);
            } finally {
                if (alive) setProfileReady(true);
                profileLoadingRef.current = null;
            }
        };

        load();
        return () => { alive = false; };
    }, [session?.user?.id]);

    const register = useCallback(
        async (form: RegisterForm, remember: boolean = true) => {
            const { fullName, motherName, email, password, village, landAreaHa } = form;
            const luasSafe = toNum(landAreaHa);

            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;

            await AsyncStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");

            const uid = data.session?.user?.id;
            if (!uid) {
                // Pending verification case
                await AsyncStorage.setItem(PENDING_PROFILE, JSON.stringify({
                    full_name: fullName.trim(),
                    nama_desa: village.trim(),
                    luas_lahan: luasSafe,
                }));
                await AsyncStorage.setItem(PENDING_ANSWER, motherName.trim());
                return;
            }

            // Direct login case
            await updateMyProfile({
                full_name: fullName.trim(),
                nama_desa: village.trim(),
                luas_lahan: luasSafe,
            });

            const { error: rpcErr } = await supabase.rpc("set_mother_name", {
                p_user_id: uid,
                p_answer: motherName,
            });
            if (rpcErr) throw new Error("Gagal menyimpan data keamanan (Nama Ibu)");
        },
        []
    );

    const signIn = useCallback(
        async (email: string, _password: string, remember: boolean = false) => {
            const res = await supabase.auth.signInWithPassword({ email, password: _password });
            if (res.error) throw res.error.message;
            await AsyncStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
            return res;
        },
        []
    );

    const signOut = useCallback(async () => {
        // Just call supabase signOut, listener will handle the rest
        await supabase.auth.signOut({ scope: "global" }).catch(() => {});
        await AsyncStorage.setItem(REMEMBER_KEY, "0");
    }, []);

    const reloadProfile = useCallback(async () => {
        const userId = session?.user?.id;
        if (!userId) return;

        // Background reload, no need to flip profileReady 
        // which would unmount the entire navigation layout
        try {
            const p = await getMyProfile(userId);
            setProfile(p);
        } catch (e: any) {
            console.error(TAG, "reloadProfile error:", e?.message);
        } 
    }, [session?.user?.id]);

    const updateProfile = useCallback(
        async (patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "luas_lahan">>) => {
            try {
                const updated = await updateMyProfile(patch);
                setProfile(updated);
            } catch (e) {
                console.error("updateProfile error:", e);
                throw e;
            }
        },
        []
    );

    const deleteSelf = useCallback(async () => {
        const targetUserId = session?.user?.id;
        if (!targetUserId) throw new Error("Tidak ada sesi pengguna.");

        const { error } = await supabase.functions.invoke("admin-delete-user", {
            body: { targetUserId },
        });

        if (error) {
            if (error instanceof FunctionsHttpError) {
                const payload = await error.context.json().catch(() => ({} as any));
                throw new Error((payload as any)?.error || "Gagal menghapus akun");
            }
            throw error;
        }
    }, [session?.user?.id]);

    const value = useMemo<AuthState>(
        () => ({
            session,
            user: session?.user ?? null,
            authReady,
            isInitialized,
            profile,
            profileReady,
            role: profile?.role ?? null,
            register,
            signIn,
            signOut,
            reloadProfile,
            updateProfile,
            deleteSelf,
        }),
        [session, authReady, isInitialized, profile, profileReady, register, signIn, signOut, reloadProfile, updateProfile, deleteSelf]
    );

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}

import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthTokenResponsePassword, Session, User } from "@supabase/supabase-js";
import { FunctionsHttpError } from "@supabase/supabase-js"; // ⬅️ tambah ini
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
    profile: Profile | null;
    profileReady: boolean;
    role: Role | null;

    register: (form: RegisterForm, remember?: boolean) => Promise<void>;

    signIn: (email: string, password: string, remember?: boolean) => Promise<AuthTokenResponsePassword>;
    signOut: () => Promise<void>;
    reloadProfile: () => Promise<void>;
    updateProfile: (patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "luas_lahan">>) => Promise<void>;

    deleteSelf: () => Promise<void>; // ⬅️ tambah API self-delete
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [authReady, setAuthReady] = useState(false);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileReady, setProfileReady] = useState(false);

    useEffect(() => {
        let alive = true;
        console.log(TAG, "mount: start bootstrap");

        (async () => {
            try {
                const remember = await AsyncStorage.getItem(REMEMBER_KEY);
                console.log(TAG, "bootstrap: remember =", remember);

                if (remember !== "1") {
                    console.log(TAG, "bootstrap: non-remember mode → signOut to clear persisted session");
                    await supabase.auth.signOut().catch((e) => {
                        console.log(TAG, "bootstrap: signOut (non-remember) catch:", e?.message);
                    });
                    if (!alive) return;
                    setSession(null);
                    setAuthReady(true);
                    console.log(TAG, "bootstrap: done (non-remember)");
                } else {
                    console.log(TAG, "bootstrap: remember mode → getSession()");
                    const { data, error } = await supabase.auth.getSession();
                    if (error) console.log(TAG, "getSession error:", error.message);
                    if (!alive) return;
                    setSession(data.session ?? null);
                    setAuthReady(true);
                    console.log(TAG, "bootstrap: done (remember), session.user.id =", data.session?.user?.id ?? null);
                }
            } catch (e: any) {
                console.log(TAG, "bootstrap error:", e?.message);
                if (!alive) return;
                setSession(null);
                setAuthReady(true);
            }
        })();

        const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
            console.log(TAG, "onAuthStateChange:", event, "user.id =", sess?.user?.id ?? null);
            setSession(sess ?? null);
            setAuthReady(true);

            if (event === "SIGNED_OUT") {
                console.log(TAG, "onAuthStateChange: SIGNED_OUT → clear profile state");
                setProfile(null);
                setProfileReady(false);
            }
            if (event === "SIGNED_IN" && sess?.user?.id) {
                (async () => {
                    try {
                        const pendingAnswer = await AsyncStorage.getItem(PENDING_ANSWER);
                        const patchStr = await AsyncStorage.getItem(PENDING_PROFILE);
                        if (pendingAnswer || patchStr) {
                            console.log(TAG, "post-login: applying pending registration data");
                            if (patchStr) {
                                try {
                                    const patch = JSON.parse(patchStr);
                                    await updateMyProfile(patch);
                                    await AsyncStorage.removeItem(PENDING_PROFILE);
                                } catch (e: any) {
                                    console.log(TAG, "post-login: apply pending profile patch error:", e?.message);
                                }
                            }
                            if (pendingAnswer) {
                                const { error: rpcErr } = await supabase.rpc("set_mother_name", {
                                    p_user_id: sess.user.id,
                                    p_answer: pendingAnswer,
                                });
                                if (rpcErr) {
                                    console.log(TAG, "post-login: set_mother_name RPC error:", rpcErr.message);
                                } else {
                                    await AsyncStorage.removeItem(PENDING_ANSWER);
                                }
                            }
                            await reloadProfile();
                        }
                    } catch (e: any) {
                        console.log(TAG, "post-login: apply pending error:", e?.message);
                    }
                })();
            }
        });

        return () => {
            alive = false;
            console.log(TAG, "unmount: unsubscribe auth listener");
            sub.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        let alive = true;

        async function loadProfileOnce() {
            setProfileReady(false);
            const uid = session?.user?.id ?? null;
            console.log(TAG, "loadProfileOnce: start for user.id =", uid);

            try {
                const p = await getMyProfile();
                if (!alive) return;
                setProfile(p ?? null);
                console.log(TAG, "loadProfileOnce: success, role =", p?.role ?? null);
            } catch (e: any) {
                console.log(TAG, "loadProfileOnce error:", e?.message);
                if (!alive) return;
                setProfile(null);
            } finally {
                if (alive) {
                    setProfileReady(true);
                    console.log(TAG, "loadProfileOnce: done (profileReady=true)");
                }
            }
        }

        const userId = session?.user?.id ?? null;
        if (!userId) {
            console.log(TAG, "session changed: no user → clear profile, profileReady=false");
            setProfile(null);
            setProfileReady(false);
            return;
        }

        loadProfileOnce();
        return () => {
            alive = false;
            console.log(TAG, "loadProfileOnce: cancel (effect cleanup)");
        };
    }, [session?.user?.id]);

    const register = useCallback(
        async (form: RegisterForm, remember: boolean = true) => {
            const { fullName, motherName, email, password, village, landAreaHa } = form;
            const luas = Number((landAreaHa ?? "").toString().trim().replace(",", "."));
            const luasSafe = Number.isFinite(luas) && luas >= 0 ? luas : 0;

            console.log(TAG, "register: start for", email);
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) {
                console.log(TAG, "register: signUp error:", error.message);
                throw error;
            }
            try {
                await AsyncStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
            } catch (e: any) {
                console.log(TAG, "register: set REMEMBER_KEY error:", e?.message);
            }

            const uid = data.session?.user?.id ?? null;
            if (!uid) {
                try {
                    await AsyncStorage.setItem(
                        PENDING_PROFILE,
                        JSON.stringify({
                            full_name: fullName.trim(),
                            nama_desa: village.trim(),
                            luas_lahan: luasSafe,
                        })
                    );
                    await AsyncStorage.setItem(PENDING_ANSWER, motherName.trim());
                } catch (e: any) {
                    console.log(TAG, "register: save pending error:", e?.message);
                }
                console.log(TAG, "register: no session (likely email confirm). Pending saved.");
                return;
            }
            try {
                await updateMyProfile({
                    full_name: fullName.trim(),
                    nama_desa: village.trim(),
                    luas_lahan: luasSafe,
                });
                console.log(TAG, "register: profile updated");
            } catch (e: any) {
                console.log(TAG, "register: updateMyProfile error:", e?.message);
                // lanjut set mother_name walau profil gagal (tidak fatal)
            }

            const { error: rpcErr } = await supabase.rpc("set_mother_name", {
                p_user_id: uid,
                p_answer: motherName,
            });
            if (rpcErr) {
                console.log(TAG, "register: set_mother_name RPC error:", rpcErr.message);
            } else {
                console.log(TAG, "register: mother_name set (hashed)");
            }
            console.log(TAG, "register: done for", email);
        },
        []
    );

    const signIn = useCallback(
        async (email: string, _password: string, remember: boolean = false) => {
            console.log(TAG, "signIn: start for", email, "remember =", remember);
            const res = await supabase.auth.signInWithPassword({ email, password: _password });
            console.log(
                TAG,
                "signIn: supabase response: error =",
                res.error?.message ?? null,
                "user.id =",
                res.data?.user?.id ?? null
            );
            if (res.error) throw res.error?.message;
            try {
                await AsyncStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
                console.log(TAG, "signIn: REMEMBER_KEY set to", remember ? "1" : "0");
            } catch (e: any) {
                console.log(TAG, "signIn: set REMEMBER_KEY error:", e?.message);
            }

            return res;
        },
        []
    );

    const signOut = useCallback(async () => {
        console.log(TAG, "signOut: start");
        await supabase.auth.signOut().catch((e) => {
            console.log(TAG, "signOut: supabase error:", e?.message);
        });
        try {
            await AsyncStorage.setItem(REMEMBER_KEY, "0");
            console.log(TAG, "signOut: REMEMBER_KEY set to 0");
        } catch (e: any) {
            console.log(TAG, "signOut: set REMEMBER_KEY error:", e?.message);
        }
        setProfile(null);
        setProfileReady(false);
        console.log(TAG, "signOut: done, profile cleared");
    }, []);

    const reloadProfile = useCallback(async () => {
        const userId = session?.user?.id;
        if (!userId) {
            console.log(TAG, "reloadProfile: skipped (no user)");
            return;
        }

        console.log(TAG, "reloadProfile: start for user.id =", userId);
        try {
            setProfileReady(false);
            const p = await getMyProfile();
            setProfile(p ?? null);
            console.log(TAG, "reloadProfile: success, role =", p?.role ?? null);
        } catch (e: any) {
            console.log(TAG, "reloadProfile error:", e?.message);
            setProfile(null);
        } finally {
            setProfileReady(true);
            console.log(TAG, "reloadProfile: done (profileReady=true)");
        }
    }, [session?.user?.id]);

    const updateProfile = useCallback(
        async (patch: Partial<Pick<Profile, "full_name" | "nama_desa" | "luas_lahan">>) => {
            try {
                const updated = await updateMyProfile(patch);
                setProfile(updated);
            } catch (e) {
                console.log("updateProfile error:", e);
            }
        },
        []
    );

    const deleteSelf = useCallback(async () => {
        const targetUserId = session?.user?.id;
        if (!targetUserId) {
            throw new Error("Tidak ada sesi pengguna.");
        }

        // Panggil Edge Function yang menggunakan service role untuk menghapus akun
        const { error } = await supabase.functions.invoke("admin-delete-user", {
            body: { targetUserId },
        });

        if (error) {
            if (error instanceof FunctionsHttpError) {
                const payload = await error.context.json().catch(() => ({} as any));
                const msg = (payload as any)?.error || "Gagal menghapus akun";
                throw new Error(msg);
            }
            throw error;
        }

        // Sukses → logout lokal
        await signOut();
    }, [session?.user?.id, signOut]);

    const value = useMemo<AuthState>(
        () => ({
            session,
            user: session?.user ?? null,
            authReady,
            profile,
            profileReady,
            role: profile?.role ?? null,
            register,
            signIn,
            signOut,
            reloadProfile,
            updateProfile,
            deleteSelf, // ⬅️ expose ke consumer
        }),
        [session, authReady, profile, profileReady, register, signIn, signOut, reloadProfile, updateProfile, deleteSelf]
    );

    console.log(
        TAG,
        "render provider: authReady=",
        authReady,
        "profileReady=",
        profileReady,
        "user.id=",
        session?.user?.id ?? null
    );

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}

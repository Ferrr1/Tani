import { Colors, Fonts, Tokens } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

type ResetForm = { password: string; confirm: string };

async function createSessionFromUrl(url: string, dbg?: (s: string) => void) {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (dbg) dbg(`createSessionFromUrl(reset): ${url}`);
    if (errorCode) throw new Error(errorCode);

    if (params.access_token && params.refresh_token) {
        if (dbg) dbg("→ setSession via access_token/refresh_token");
        const { error } = await supabase.auth.setSession({
            access_token: String(params.access_token),
            refresh_token: String(params.refresh_token),
        });
        if (error) throw error;
        return true;
    }

    if (params.code) {
        if (dbg) dbg("→ exchangeCodeForSession via code");
        const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
        if (error) throw error;
        return true;
    }

    if (params.token_hash && params.email) {
        if (dbg) dbg("→ verifyOtp(recovery) via token_hash+email");
        const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: String(params.token_hash),
            email: String(params.email),
        });
        if (error) throw error;
        return true;
    }

    if (dbg) dbg("→ no known auth params in URL");
    return false;
}

export default function ResetPasswordScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const [submitting, setSubmitting] = useState(false);
    const [hasSession, setHasSession] = useState<boolean | null>(null);

    const { control, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>({
        defaultValues: { password: "", confirm: "" },
        mode: "onChange",
    });

    useEffect(() => {
        let mounted = true;

        async function ensureSession(urlFromEvent?: string | null) {
            try {
                const initialUrl = urlFromEvent ?? (await Linking.getInitialURL());
                if (initialUrl) {
                    try {
                        await createSessionFromUrl(initialUrl);
                    } catch (err: any) {
                        console.warn("createSessionFromUrl error:", err?.message ?? String(err));
                    }
                }

                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (mounted) {
                    setHasSession(!!data.session);
                }
            } catch (e: any) {
                console.warn("ensureSession error:", e?.message ?? String(e));
                if (mounted) setHasSession(false);
            }
        }

        const sub = Linking.addEventListener("url", ({ url }) => {
            ensureSession(url);
        });

        ensureSession(null);

        return () => { sub.remove(); mounted = false; };
    }, []);

    const onSubmit = async (v: ResetForm) => {
        if (!hasSession) {
            Alert.alert("Belum Terverifikasi", "Buka tautan reset dari email/halaman verifikasi terlebih dahulu.");
            return;
        }
        if (v.password.length < 6) {
            Alert.alert("Validasi", "Password minimal 6 karakter.");
            return;
        }
        if (v.password !== watch("password")) {
        }
        if (v.password !== v.confirm) {
            Alert.alert("Validasi", "Konfirmasi password tidak cocok.");
            return;
        }

        try {
            setSubmitting(true);
            const { error } = await supabase.auth.updateUser({ password: v.password });
            if (error) throw error;

            Alert.alert("Sukses", "Password telah diperbarui. Silakan masuk kembali.", [
                {
                    text: "OK",
                    onPress: async () => {
                        await supabase.auth.signOut().catch(() => { });
                        router.replace("/");
                    },
                },
            ]);
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Gagal memperbarui password.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <KeyboardAwareScrollView
                contentContainerStyle={{ flexGrow: 1, padding: S.spacing.lg }}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
                enableAutomaticScroll
                extraScrollHeight={Platform.select({ ios: 80, android: 120 })}
            >
                <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>Reset Password</Text>
                <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                    {hasSession === false
                        ? "Tidak ada sesi pemulihan. Selesaikan verifikasi terlebih dahulu."
                        : "Masukkan password baru Anda di bawah ini."}
                </Text>

                <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg }]}>
                    <Text style={[styles.label, { color: C.text }]}>Password Baru</Text>
                    <Controller
                        control={control}
                        name="password"
                        rules={{ required: "Wajib diisi", minLength: { value: 6, message: "Minimal 6 karakter" } }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                placeholder="Password baru"
                                placeholderTextColor={C.icon}
                                secureTextEntry
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                style={[
                                    styles.input,
                                    { color: C.text, borderColor: errors.password ? C.danger : C.border, borderRadius: S.radius.md },
                                ]}
                            />
                        )}
                    />
                    {errors.password && <Text style={[styles.err, { color: C.danger }]}>{errors.password.message}</Text>}

                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Konfirmasi Password</Text>
                    <Controller
                        control={control}
                        name="confirm"
                        rules={{
                            required: "Wajib diisi",
                            validate: (v) => v === watch("password") || "Konfirmasi tidak cocok",
                        }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                placeholder="Ulangi password baru"
                                placeholderTextColor={C.icon}
                                secureTextEntry
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                style={[
                                    styles.input,
                                    { color: C.text, borderColor: errors.confirm ? C.danger : C.border, borderRadius: S.radius.md },
                                ]}
                            />
                        )}
                    />
                    {errors.confirm && <Text style={[styles.err, { color: C.danger }]}>{errors.confirm.message}</Text>}

                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={submitting}
                        style={({ pressed }) => [
                            styles.button,
                            {
                                backgroundColor: submitting ? C.tint + "CC" : C.tint,
                                borderRadius: S.radius.md,
                                opacity: pressed ? 0.95 : 1,
                            },
                        ]}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="key-outline" size={18} color="#fff" />
                                <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>Ganti Password</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2, marginBottom: 10 },
    card: { marginTop: 12, padding: 16, borderWidth: 1 },
    label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
    input: {
        borderWidth: 1,
        fontSize: 15,
        paddingHorizontal: 12,
        paddingVertical: Platform.select({ ios: 10, android: 8 }) as number,
        backgroundColor: "transparent",
    },
    err: { marginTop: 6, fontSize: 12 },
    button: { marginTop: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

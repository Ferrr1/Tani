import { Colors, Fonts, Tokens } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useState } from "react";
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

WebBrowser.maybeCompleteAuthSession();

type VerifyForm = { email: string; motherName: string };

type VerifyResp = {
    ok?: boolean;
    action_link?: string | null;
    token_hash?: string | null;
    email_otp?: string | null;
    error?: string;
};

async function createSessionFromUrl(urlString: string) {
    const { params, errorCode } = QueryParams.getQueryParams(urlString);
    if (errorCode) throw new Error(errorCode);

    if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
            access_token: String(params.access_token),
            refresh_token: String(params.refresh_token),
        });
        if (error) throw error;
        return true;
    }
    if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
        if (error) throw error;
        return true;
    }
    if (params.token_hash && params.email) {
        const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: String(params.token_hash),
            email: String(params.email),
        });
        if (error) throw error;
        return true;
    }

    return false;
}

export default function VerifyMotherScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const { control, handleSubmit, formState: { errors }, watch } = useForm<VerifyForm>({
        defaultValues: { email: "", motherName: "" },
        mode: "onChange",
    });

    const emailVal = watch("email");
    const redirectTo = useMemo(() => {
        const uri = makeRedirectUri({
            path: `reset-password?email=${encodeURIComponent((emailVal ?? "").trim())}`,
        });
        return uri;
    }, [emailVal]);

    const onSubmit = async (v: VerifyForm) => {
        try {
            setSubmitting(true);

            const { data, error } = await supabase.functions.invoke<VerifyResp>("verify-mother-name", {
                body: { email: v.email.trim(), answer: v.motherName.trim(), redirectTo },
            });

            if (error) {
                if (error instanceof FunctionsHttpError) {
                    try {
                        // @ts-ignore
                        const j = await error.context?.json?.();
                        throw new Error(j?.error || "Gagal memverifikasi permintaan");
                    } catch {
                        throw new Error("Gagal memverifikasi permintaan");
                    }
                }
                throw error;
            }

            if (!data?.ok) {
                Alert.alert("Verifikasi gagal", "Cek kembali email & nama ibu, lalu coba lagi.");
                return;
            }

            if (data.action_link) {
                if (Platform.OS === "web") {
                    window.location.href = data.action_link;
                    return;
                }

                await WebBrowser.warmUpAsync().catch(() => { });
                const res = await WebBrowser.openAuthSessionAsync(data.action_link, redirectTo);
                await WebBrowser.coolDownAsync().catch(() => { });

                if (res.type === "success" && res.url) {
                    try {
                        const ok = await createSessionFromUrl(res.url);
                        if (!ok) {
                            Alert.alert("Gagal", "Tidak dapat membuat sesi dari tautan.");
                            return;
                        }
                        router.replace("/reset-password");
                        return;
                    } catch (err: any) {
                        Alert.alert("Error", err?.message ?? "Tidak dapat membuat sesi dari tautan.");
                        return;
                    }
                } else if (res.type === "cancel") {
                    Alert.alert("Dibatalkan", "Proses verifikasi dibatalkan.");
                    return;
                } else {
                    await WebBrowser.openBrowserAsync(data.action_link).catch(() => { });
                    Alert.alert("Info", "Jika halaman sudah terbuka di browser, selesaikan verifikasi lalu kembali ke aplikasi.");
                    return;
                }
            }

            if (data.token_hash) {
                const deepLink = Linking.createURL(
                    `/reset-password?type=recovery&email=${encodeURIComponent(v.email.trim())}&token_hash=${encodeURIComponent(
                        data.token_hash
                    )}`
                );
                await Linking.openURL(deepLink);
                return;
            }

            Alert.alert("Verifikasi gagal", "Tidak bisa membuat tautan reset saat ini.");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Tidak dapat memproses permintaan.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <View style={{ flexDirection: "row", justifyContent: "flex-start", gap: 12, alignItems: "center" }}>
                    <Pressable
                        onPress={() => router.replace("/(auth)")}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <View>
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Verifikasi Lupa Password
                        </Text>
                        <Text style={[styles.subtitle, { maxWidth: 300, color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                            Masukkan email dan nama ibu kandung untuk mendapatkan tautan reset password.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <KeyboardAwareScrollView
                contentContainerStyle={{ flexGrow: 1, padding: S.spacing.lg }}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
                enableAutomaticScroll
                extraScrollHeight={Platform.select({ ios: 80, android: 120 })}
            >
                <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg }]}>
                    {/* Email */}
                    <Text style={[styles.label, { color: C.text }]}>Email</Text>
                    <Controller
                        control={control}
                        name="email"
                        rules={{ required: "Email wajib diisi" }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                placeholder="nama@domain.com"
                                placeholderTextColor={C.icon}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                style={[
                                    styles.input,
                                    { color: C.text, borderColor: errors.email ? C.danger : C.border, borderRadius: S.radius.md },
                                ]}
                            />
                        )}
                    />
                    {errors.email && <Text style={[styles.err, { color: C.danger }]}>{errors.email.message}</Text>}

                    {/* Nama Ibu */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Nama Ibu</Text>
                    <Controller
                        control={control}
                        name="motherName"
                        rules={{ required: "Nama ibu wajib diisi" }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                placeholder="Nama ibu kandung"
                                placeholderTextColor={C.icon}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                style={[
                                    styles.input,
                                    { color: C.text, borderColor: errors.motherName ? C.danger : C.border, borderRadius: S.radius.md },
                                ]}
                            />
                        )}
                    />
                    {errors.motherName && <Text style={[styles.err, { color: C.danger }]}>{errors.motherName.message}</Text>}

                    {/* Submit */}
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
                                <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                                <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>Kirim Tautan Reset</Text>
                            </>
                        )}
                    </Pressable>

                    <Text style={{ color: C.textMuted, marginTop: 10, fontSize: 12 }}>
                        Verifikasi dilakukan secara aman di server.
                    </Text>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2 },
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

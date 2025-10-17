import { Colors, Fonts, Tokens } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
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
    useColorScheme,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

type VerifyForm = { email: string; motherName: string };
type ResetForm = { password: string };

type VerifyResp = {
    ok?: boolean;
    verified?: boolean;
    error?: string;
};

type ResetResp = {
    ok?: boolean;
    changed?: boolean;
    error?: string;
};

type Step = "verify" | "reset" | "done";

export default function ForgetPasswordScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;

    const [step, setStep] = useState<Step>("verify");
    const [submitting, setSubmitting] = useState(false);
    const [emailLocked, setEmailLocked] = useState<string>("");
    const [motherNameLocked, setMotherNameLocked] = useState<string>("");
    const [showPassword, setShowPassword] = useState(false);

    // form verifikasi
    const {
        control: ctrlVerify,
        handleSubmit: submitVerify,
        formState: { errors: errVerify },
    } = useForm<VerifyForm>({
        defaultValues: { email: "", motherName: "" },
        mode: "onChange",
    });

    // form reset
    const {
        control: ctrlReset,
        handleSubmit: submitReset,
        formState: { errors: errReset },
        watch: watchReset,
    } = useForm<ResetForm>({
        defaultValues: { password: "" },
        mode: "onChange",
    });

    const passwordVal = watchReset("password");
    const pwStrength = useMemo(() => {
        let score = 0;
        if (passwordVal.length >= 8) score++;
        if (/[A-Z]/.test(passwordVal)) score++;
        if (/[a-z]/.test(passwordVal)) score++;
        if (/[0-9]/.test(passwordVal)) score++;
        if (/[^A-Za-z0-9]/.test(passwordVal)) score++;
        return score; // 0..5
    }, [passwordVal]);

    // 1) VERIFIKASI (pakai fungsi yang sama)
    const onVerify = async (v: VerifyForm) => {
        try {
            setSubmitting(true);
            const { data, error } = await supabase.functions.invoke<VerifyResp>(
                "reset-password-by-mother",
                {
                    body: {
                        email: v.email.trim(),
                        answer: v.motherName.trim(),
                    },
                }
            );

            if (error) {
                let msg = "Gagal memverifikasi permintaan.";
                try {
                    // @ts-ignore
                    const j = await (error as any).context?.json?.();
                    if (j?.error) msg = String(j.error);
                } catch { }
                throw new Error(msg);
            }

            if (!data?.ok || !data?.verified) {
                Alert.alert(
                    "Verifikasi gagal",
                    data?.error ?? "Cek kembali email & nama ibu, lalu coba lagi."
                );
                return;
            }

            setEmailLocked(v.email.trim());
            setMotherNameLocked(v.motherName.trim());
            setStep("reset");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Tidak dapat memproses verifikasi.");
        } finally {
            setSubmitting(false);
        }
    };

    // 2) RESET PASSWORD (tanpa confirm)
    const onReset = async (v: ResetForm) => {
        if (!emailLocked || !motherNameLocked) {
            Alert.alert("Belum Terverifikasi", "Lengkapi verifikasi terlebih dahulu.");
            return;
        }
        if (v.password.length < 8) {
            Alert.alert("Validasi", "Password minimal 8 karakter.");
            return;
        }

        try {
            setSubmitting(true);
            const { data, error } = await supabase.functions.invoke<ResetResp>(
                "reset-password-by-mother",
                {
                    body: {
                        email: emailLocked,
                        answer: motherNameLocked,
                        new_password: v.password,
                    },
                }
            );

            if (error) {
                let msg = "Gagal memperbarui password.";
                try {
                    // @ts-ignore
                    const j = await (error as any).context?.json?.();
                    if (j?.error) msg = String(j.error);
                } catch { }
                throw new Error(msg);
            }

            if (!data?.ok || !data?.changed) {
                Alert.alert("Gagal", data?.error ?? "Tidak bisa reset password.");
                return;
            }

            setStep("done");
            Alert.alert("Sukses", "Password telah diperbarui. Silakan login dengan password baru.");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Gagal memperbarui password.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header */}
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
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>Lupa Password</Text>
                        <Text
                            style={[
                                styles.subtitle,
                                { color: C.textMuted, fontFamily: Fonts.serif as any },
                            ]}
                        >
                            {step === "verify"
                                ? "Masukkan email dan nama ibu kandung untuk verifikasi."
                                : step === "reset"
                                    ? `Verifikasi berhasil untuk ${emailLocked}. Silakan buat password baru.`
                                    : "Password sudah diperbarui. Anda bisa kembali ke halaman login."}
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
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: C.surface,
                            borderColor: C.border,
                            borderRadius: S.radius.lg,
                        },
                    ]}
                >
                    {step === "verify" && (
                        <>
                            {/* Email */}
                            <Text style={[styles.label, { color: C.text }]}>Email</Text>
                            <Controller
                                control={ctrlVerify}
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
                                            {
                                                color: C.text,
                                                borderColor: errVerify.email ? C.danger : C.border,
                                                borderRadius: S.radius.md,
                                            },
                                        ]}
                                    />
                                )}
                            />
                            {errVerify.email && (
                                <Text style={[styles.err, { color: C.danger }]}>
                                    {errVerify.email.message}
                                </Text>
                            )}

                            {/* Nama Ibu */}
                            <Text
                                style={[
                                    styles.label,
                                    { color: C.text, marginTop: S.spacing.md },
                                ]}
                            >
                                Nama Ibu Kandung
                            </Text>
                            <Controller
                                control={ctrlVerify}
                                name="motherName"
                                rules={{ required: "Nama ibu kandung wajib diisi" }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        placeholder="Nama ibu kandung"
                                        placeholderTextColor={C.icon}
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        style={[
                                            styles.input,
                                            {
                                                color: C.text,
                                                borderColor: errVerify.motherName ? C.danger : C.border,
                                                borderRadius: S.radius.md,
                                            },
                                        ]}
                                    />
                                )}
                            />
                            {errVerify.motherName && (
                                <Text style={[styles.err, { color: C.danger }]}>
                                    {errVerify.motherName.message}
                                </Text>
                            )}

                            {/* Submit Verifikasi */}
                            <Pressable
                                onPress={submitVerify(onVerify)}
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
                                        <Ionicons
                                            name="shield-checkmark-outline"
                                            size={18}
                                            color="#fff"
                                        />
                                        <Text
                                            style={[
                                                styles.btnText,
                                                { fontFamily: Fonts.rounded as any },
                                            ]}
                                        >
                                            Verifikasi
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </>
                    )}

                    {step === "reset" && (
                        <>
                            {/* Password Baru (tanpa confirm) */}
                            <Text style={[styles.label, { color: C.text }]}>
                                Password Baru
                            </Text>
                            <Controller
                                control={ctrlReset}
                                name="password"
                                rules={{
                                    required: "Wajib diisi",
                                    minLength: { value: 8, message: "Minimal 8 karakter" },
                                }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={{ gap: 8 }}>
                                        <View style={{ position: "relative" }}>
                                            <TextInput
                                                placeholder="Password baru"
                                                placeholderTextColor={C.icon}
                                                secureTextEntry={!showPassword}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                                style={[
                                                    styles.input,
                                                    {
                                                        color: C.text,
                                                        borderColor: errReset.password ? C.danger : C.border,
                                                        borderRadius: Tokens.radius.md,
                                                        paddingRight: 44,
                                                    },
                                                ]}
                                            />
                                            <Pressable
                                                onPress={() => setShowPassword((s) => !s)}
                                                style={{
                                                    position: "absolute",
                                                    right: 8,
                                                    top: 0,
                                                    bottom: 0,
                                                    justifyContent: "center",
                                                    paddingHorizontal: 6,
                                                }}
                                            >
                                                <Ionicons
                                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                    size={18}
                                                    color={C.icon}
                                                />
                                            </Pressable>
                                        </View>

                                        {/* Indikator kekuatan sederhana */}
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: C.textMuted,
                                                marginTop: 2,
                                            }}
                                        >
                                            Kekuatan:{" "}
                                            {pwStrength <= 1
                                                ? "Lemah"
                                                : pwStrength <= 3
                                                    ? "Sedang"
                                                    : "Kuat"}
                                        </Text>
                                    </View>
                                )}
                            />
                            {errReset.password && (
                                <Text style={[styles.err, { color: C.danger }]}>
                                    {errReset.password.message}
                                </Text>
                            )}

                            {/* Submit Reset */}
                            <Pressable
                                onPress={submitReset(onReset)}
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
                                        <Text
                                            style={[
                                                styles.btnText,
                                                { fontFamily: Fonts.rounded as any },
                                            ]}
                                        >
                                            Ganti Password
                                        </Text>
                                    </>
                                )}
                            </Pressable>

                            {/* Kembali ubah email jika perlu */}
                            <Pressable
                                onPress={() => {
                                    setStep("verify");
                                    setEmailLocked("");
                                    setMotherNameLocked("");
                                }}
                                style={{ marginTop: 10, alignSelf: "center" }}
                            >
                                <Text style={[styles.link, { textAlign: "center", marginTop: 16, color: C.tint }]}>
                                    Verifikasi Ulang
                                </Text>
                            </Pressable>
                        </>
                    )}

                    {step === "done" && (
                        <>
                            <View style={{ alignItems: "center", gap: 12 }}>
                                <Ionicons name="checkmark-circle" size={40} color={C.tint} />
                                <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>
                                    Password berhasil diubah
                                </Text>
                                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                    Silakan login dengan password baru Anda.
                                </Text>
                            </View>
                            <Link href={"/(auth)"} style={[styles.link, { textAlign: "center", marginTop: 16, color: C.tint }]}>
                                Login
                            </Link>
                        </>
                    )}
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2, maxWidth: 300 },
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
    button: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    link: { fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

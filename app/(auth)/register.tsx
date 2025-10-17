import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { RegisterForm } from "@/types/profile";
import { EMAIL_REGEX } from "@/types/regex";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import React, { useState } from "react";
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

export default function RegisterScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;

    const { register: registerUser, authReady } = useAuth();

    const [showPwd, setShowPwd] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterForm>({
        defaultValues: {
            fullName: "",
            motherName: "",
            email: "",
            password: "",
            village: "",
            landAreaHa: "",
        },
        mode: "onChange",
    });

    const onSubmit = async (v: RegisterForm) => {
        try {
            setSubmitting(true);
            await registerUser({
                fullName: v.fullName.trim(),
                motherName: v.motherName.trim(),
                email: v.email.trim(),
                password: v.password,
                village: v.village.trim(),
                landAreaHa: v.landAreaHa,
            }, true);
        } catch (e: any) {
            console.warn("register error", e);
            const msg = e?.message || "Terjadi kesalahan saat pendaftaran";
            Alert.alert("Gagal Daftar", msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
            <KeyboardAwareScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                enableOnAndroid
                enableAutomaticScroll
                extraScrollHeight={Platform.select({ ios: 80, android: 120 })}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.container, { padding: S.spacing.lg }]}>
                    <Text style={[styles.title, { color: C.text, fontFamily: Fonts.sans as any }]}>
                        Pendaftaran Pengguna
                    </Text>
                    <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                        Isi data berikut untuk mulai menggunakan aplikasi.
                    </Text>

                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: C.surface,
                                borderColor: C.border,
                                borderRadius: S.radius.lg,
                                ...(scheme === "light" ? S.shadow.light : S.shadow.dark),
                            },
                        ]}
                    >
                        {/* Nama Lengkap */}
                        <Text style={[styles.label, { color: C.text }]}>Nama Lengkap</Text>
                        <Controller
                            control={control}
                            name="fullName"
                            rules={{ required: "Nama wajib diisi" }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    placeholder="Nama lengkap"
                                    placeholderTextColor={C.icon}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: errors.fullName ? C.danger : C.border,
                                            color: C.text,
                                            fontFamily: Fonts.sans as any,
                                            borderRadius: S.radius.md,
                                            paddingHorizontal: S.spacing.md,
                                            paddingVertical: 10,
                                        },
                                    ]}
                                />
                            )}
                        />
                        {errors.fullName && (
                            <Text style={[styles.err, { color: C.danger }]}>{errors.fullName.message}</Text>
                        )}

                        {/* Nama Ibu */}
                        <Text style={[styles.label, { marginTop: S.spacing.md, color: C.text }]}>Nama Ibu Kandung (untuk verifikasi reset password)</Text>
                        <Controller
                            control={control}
                            name="motherName"
                            rules={{ required: "Nama wajib diisi" }}
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
                                            borderColor: errors.motherName ? C.danger : C.border,
                                            color: C.text,
                                            fontFamily: Fonts.sans as any,
                                            borderRadius: S.radius.md,
                                            paddingHorizontal: S.spacing.md,
                                            paddingVertical: 10,
                                        },
                                    ]}
                                />
                            )}
                        />
                        {errors.motherName && (
                            <Text style={[styles.err, { color: C.danger }]}>{errors.motherName.message}</Text>
                        )}

                        {/* Email */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Email</Text>
                        <Controller
                            control={control}
                            name="email"
                            rules={{
                                required: "Email wajib diisi",
                                pattern: { value: EMAIL_REGEX, message: "Format email tidak valid" },
                            }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    placeholder="nama@domain.com"
                                    placeholderTextColor={C.icon}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: errors.email ? C.danger : C.border,
                                            color: C.text,
                                            fontFamily: Fonts.sans as any,
                                            borderRadius: S.radius.md,
                                            paddingHorizontal: S.spacing.md,
                                            paddingVertical: 10,
                                        },
                                    ]}
                                />
                            )}
                        />
                        {errors.email && (
                            <Text style={[styles.err, { color: C.danger }]}>{errors.email.message}</Text>
                        )}

                        {/* Password */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Password</Text>
                        <Controller
                            control={control}
                            name="password"
                            rules={{
                                required: "Password wajib diisi",
                                minLength: { value: 6, message: "Minimal 6 karakter" },
                            }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={{ position: "relative" }}>
                                    <TextInput
                                        placeholder="Password"
                                        placeholderTextColor={C.icon}
                                        secureTextEntry={!showPwd}
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        style={[
                                            styles.input,
                                            {
                                                borderColor: errors.password ? C.danger : C.border,
                                                color: C.text,
                                                fontFamily: Fonts.sans as any,
                                                borderRadius: S.radius.md,
                                                paddingHorizontal: S.spacing.md,
                                                paddingVertical: 10,
                                                paddingRight: 42,
                                            },
                                        ]}
                                    />
                                    <Pressable
                                        onPress={() => setShowPwd((s) => !s)}
                                        hitSlop={10}
                                        style={{
                                            position: "absolute",
                                            right: 10,
                                            top: 10,
                                            height: 24,
                                            width: 24,
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Ionicons
                                            name={showPwd ? "eye-off-outline" : "eye-outline"}
                                            size={20}
                                            color={C.icon}
                                        />
                                    </Pressable>
                                </View>
                            )}
                        />
                        {errors.password && (
                            <Text style={[styles.err, { color: C.danger }]}>{errors.password.message}</Text>
                        )}

                        {/* Nama Desa/Kelurahan */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                            Nama Desa/Kelurahan
                        </Text>
                        <Controller
                            control={control}
                            name="village"
                            rules={{ required: "Nama Desa/Kelurahan wajib diisi" }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    placeholder="Contoh: Sukamaju"
                                    placeholderTextColor={C.icon}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: errors.village ? C.danger : C.border,
                                            color: C.text,
                                            fontFamily: Fonts.sans as any,
                                            borderRadius: S.radius.md,
                                            paddingHorizontal: S.spacing.md,
                                            paddingVertical: 10,
                                        },
                                    ]}
                                />
                            )}
                        />
                        {errors.village && (
                            <Text style={[styles.err, { color: C.danger }]}>{errors.village.message}</Text>
                        )}

                        {/* Luas Lahan (ha) */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                            Luas Lahan (hektar)
                        </Text>
                        <Controller
                            control={control}
                            name="landAreaHa"
                            rules={{
                                required: "Luas lahan wajib diisi",
                                validate: (v) => {
                                    const n = parseFloat((v || "").toString().replace(",", "."));
                                    return !(Number.isNaN(n) || n <= 0) || "Harus angka > 0";
                                },
                            }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    placeholder="contoh: 1.5"
                                    placeholderTextColor={C.icon}
                                    keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: errors.landAreaHa ? C.danger : C.border,
                                            color: C.text,
                                            fontFamily: Fonts.sans as any,
                                            borderRadius: S.radius.md,
                                            paddingHorizontal: S.spacing.md,
                                            paddingVertical: 10,
                                        },
                                    ]}
                                />
                            )}
                        />
                        {errors.landAreaHa && (
                            <Text style={[styles.err, { color: C.danger }]}>{errors.landAreaHa.message}</Text>
                        )}

                        {/* Submit */}
                        <Pressable
                            onPress={handleSubmit(onSubmit)}
                            disabled={!authReady || submitting}
                            style={({ pressed }) => [
                                styles.button,
                                {
                                    backgroundColor: !authReady || submitting ? C.tint + "CC" : C.tint,
                                    borderRadius: S.radius.md,
                                    opacity: pressed ? 0.95 : 1,
                                    marginTop: S.spacing.lg,
                                },
                            ]}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>Daftar</Text>
                            )}
                        </Pressable>

                        <Text style={[styles.info, { color: C.textMuted }]}>
                            Sudah punya akun?{" "}
                            <Link href="/" style={[styles.link, { color: C.tint }]}>
                                Masuk
                            </Link>
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.helper,
                            { backgroundColor: C.surfaceSoft, borderRadius: S.radius.lg },
                        ]}
                    >
                        <Ionicons name="information-circle-outline" size={24} color={C.textMuted} />
                        <Text style={[styles.helperText, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                            Pastikan menggunakan email dan password yang mudah di ingat.
                        </Text>
                    </View>

                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    container: { flexGrow: 1, gap: 8, justifyContent: "center" },
    title: { fontSize: 26, fontWeight: "700" },
    subtitle: { fontSize: 14, marginTop: -4 },
    card: { marginTop: 16, padding: 16, borderWidth: 1 },
    label: { fontSize: 13, marginBottom: 6, fontWeight: "600" },
    input: { borderWidth: 1, fontSize: 15, backgroundColor: "transparent" },
    selectInput: {
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    err: { marginTop: 6, fontSize: 12 },
    button: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    info: { marginTop: 14, textAlign: "center", fontSize: 13 },
    link: { fontWeight: "700", textDecorationLine: "underline" },
    helper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: 8,
    },
    helperText: {
        flexShrink: 1,
        flexGrow: 1,
        flexBasis: 0,
    },
});

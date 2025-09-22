import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { openWhatsApp } from "@/services/openWhatsApp";
import { LoginForm } from "@/types/profile";
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

export default function LoginScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;

    const { signIn, authReady } = useAuth();

    const [showPwd, setShowPwd] = useState(false);
    const [remember, setRemember] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        defaultValues: { email: "", password: "" },
        mode: "onChange",
    });

    const onSubmit = async (v: LoginForm) => {
        try {
            setSubmitting(true);
            await signIn(v.email.trim(), v.password, remember);
        } catch (error: any) {
            Alert.alert("Gagal", error?.message ?? "Tidak dapat login.");
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
                        Selamat Datang
                    </Text>
                    <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                        Aplikasi management pertanian
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
                        {/* Email */}
                        <Text style={[styles.label, { color: C.text }]}>Email</Text>
                        <Controller
                            control={control}
                            name="email"
                            rules={{
                                required: "Email wajib diisi",
                                pattern: { value: EMAIL_REGEX, message: "Format email tidak valid" },
                            }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    placeholder="contoh@gmail.com"
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

                        {/* Remember me */}
                        <Pressable
                            onPress={() => setRemember((r) => !r)}
                            style={{
                                marginTop: S.spacing.md,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                            }}
                            hitSlop={10}
                        >
                            <Ionicons
                                name={remember ? "checkbox-outline" : "square-outline"}
                                size={22}
                                color={remember ? C.tint : C.icon}
                            />
                            <Text
                                style={{
                                    color: C.text,
                                    fontFamily: Fonts.sans as any,
                                    fontSize: 14,
                                    fontWeight: "600",
                                }}
                            >
                                Ingat saya
                            </Text>
                        </Pressable>

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
                                <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>Masuk</Text>
                            )}
                        </Pressable>

                        <Text style={[styles.info, { color: C.textMuted }]}>
                            Belum punya akun?{" "}
                            <Link href="/register" style={[styles.link, { color: C.tint }]}>
                                Daftar
                            </Link>
                        </Text>

                        <Text style={[styles.info, { color: C.textMuted }]}>
                            Lupa password?{" "}
                            <Pressable
                                style={{ marginTop: 6 }}
                                onPress={() =>
                                    openWhatsApp({
                                        phone: "6282244882045",
                                        text: "Halo Admin, saya lupa password.",
                                    })
                                }
                            >
                                <Text style={[styles.link, { color: C.tint }]}>Hubungi via WhatsApp</Text>
                            </Pressable>
                        </Text>
                    </View>

                    <View style={[styles.helper, { backgroundColor: C.surfaceSoft, borderRadius: S.radius.lg }]}>
                        <Ionicons name="information-circle-outline" size={24} color={C.textMuted} />
                        <Text style={{ color: C.textMuted, fontFamily: Fonts.serif as any }}>
                            Pastikan menggunakan email yang terdaftar
                        </Text>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1 },
    container: { flex: 1, gap: 8, justifyContent: "center" },
    title: { fontSize: 26, fontWeight: "700" },
    subtitle: { fontSize: 14, marginTop: -4 },
    card: { marginTop: 16, padding: 16, borderWidth: 1 },
    label: { fontSize: 13, marginBottom: 6, fontWeight: "600" },
    input: { borderWidth: 1, fontSize: 15, backgroundColor: "transparent" },
    err: { marginTop: 6, fontSize: 12 },
    button: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    info: { marginTop: 14, textAlign: "center", fontSize: 13, alignItems: "center" },
    link: { fontWeight: "700", textDecorationLine: "underline" },
    helper: { marginTop: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
});

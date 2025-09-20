import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { CROP_OPTIONS, RegisterForm } from "@/types/profile";
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
    const { signUp, authReady } = useAuth();
    const [showPwd, setShowPwd] = useState(false);
    const [showCrop, setShowCrop] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<RegisterForm>({
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            village: "",
            cropType: "",
            cropTypeOther: "",
            landAreaHa: "",
        },
        mode: "onChange",
    });

    const cropTypeValue = watch("cropType");
    const isOther = cropTypeValue === "Lainnya";

    const onSubmit = async (v: RegisterForm) => {
        const finalCrop = v.cropType === "Lainnya" ? (v.cropTypeOther || "").trim() : v.cropType;
        const ha = parseFloat((v.landAreaHa || "").toString().replace(",", "."));
        try {
            setSubmitting(true);
            await signUp({
                email: v.email.trim(),
                password: v.password,
                meta: {
                    full_name: v.fullName.trim(),
                    nama_desa: v.village.trim(),
                    jenis_tanaman: finalCrop,
                    luas_lahan: ha,
                } as any,
            });
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
                                        style={{ position: "absolute", right: 10, top: 10, height: 24, width: 24, alignItems: "center", justifyContent: "center" }}
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
                                    placeholder="Contoh: Medangan"
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

                        {/* Jenis Tanaman — Select */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                            Jenis Tanaman
                        </Text>
                        <Controller
                            control={control}
                            name="cropType"
                            rules={{ required: "Pilih jenis tanaman" }}
                            render={({ field: { value } }) => (
                                <>
                                    <Pressable
                                        onPress={() => setShowCrop((v) => !v)}
                                        style={[
                                            styles.selectInput,
                                            {
                                                borderColor: errors.cropType ? C.danger : C.border,
                                                backgroundColor: C.surface,
                                                borderRadius: S.radius.md,
                                                paddingHorizontal: S.spacing.md,
                                                paddingVertical: 12,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color: value ? C.text : C.icon,
                                                fontFamily: Fonts.sans as any,
                                                fontSize: 15,
                                                fontWeight: "800",
                                            }}
                                        >
                                            {value || "Pilih jenis tanaman"}
                                        </Text>
                                        <Ionicons
                                            name={showCrop ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color={C.icon}
                                        />
                                    </Pressable>

                                    {showCrop && (
                                        <View
                                            style={[
                                                styles.dropdown,
                                                { borderColor: C.border, backgroundColor: C.surface, borderRadius: 12 },
                                            ]}
                                        >
                                            {CROP_OPTIONS.map((item) => (
                                                <Pressable
                                                    key={item}
                                                    onPress={() => {
                                                        setValue("cropType", item, { shouldValidate: true });
                                                        setShowCrop(false);
                                                    }}
                                                    style={({ pressed }) => [
                                                        styles.dropdownItem,
                                                        {
                                                            backgroundColor: pressed
                                                                ? scheme === "light"
                                                                    ? C.surfaceSoft
                                                                    : C.surface
                                                                : "transparent",
                                                            borderColor: C.border,
                                                        },
                                                    ]}
                                                >
                                                    <Ionicons name="leaf-outline" size={14} color={C.tint} />
                                                    <Text style={{ color: C.text, fontWeight: "700" }}>{item}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )}
                        />
                        {errors.cropType && (
                            <Text style={[styles.err, { color: C.danger }]}>{errors.cropType.message}</Text>
                        )}
                        {/* Input ‘Jenis Lainnya’ — jika pilih Lainnya */}
                        {isOther && (
                            <>
                                <Text style={[styles.label, { color: C.text, marginTop: S.spacing.sm }]}>Jenis tanaman lainnya</Text>
                                <Controller
                                    control={control}
                                    name="cropTypeOther"
                                    rules={{
                                        required: "Sebutkan jenis tanaman lainnya",
                                        validate: (v) => !!(v || "").trim() || "Sebutkan jenis tanaman lainnya",
                                    }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            placeholder="Contoh: Porang"
                                            placeholderTextColor={C.icon}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            style={[
                                                styles.input,
                                                {
                                                    color: C.text,
                                                    borderColor: errors.cropTypeOther ? C.danger : C.border,
                                                    borderRadius: S.radius.md,
                                                },
                                            ]}
                                        />
                                    )}
                                />
                                {errors.cropTypeOther && (
                                    <Text style={[styles.err, { color: C.danger }]}>{errors.cropTypeOther.message as string}</Text>
                                )}
                            </>
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
                                <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>
                                    Daftar
                                </Text>
                            )}
                        </Pressable>

                        <Text style={[styles.info, { color: C.textMuted }]}>
                            Sudah punya akun?{" "}
                            <Link href="/" style={[styles.link, { color: C.tint }]}>
                                Masuk
                            </Link>
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
    dropdown: { borderWidth: 1, marginTop: 8, overflow: "hidden" },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    err: { marginTop: 6, fontSize: 12 },
    button: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    info: { marginTop: 14, textAlign: "center", fontSize: 13 },
    link: { fontWeight: "700", textDecorationLine: "underline" },
    helper: { marginTop: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
});

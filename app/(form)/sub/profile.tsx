// app/(tabs)/ProfileScreen.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getInitialsName } from "@/utils/getInitialsName";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
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

// ====== IMPORT services yang kamu sediakan ======
import { supabase } from "@/lib/supabase";
import {
    changeMyPassword,
    updateMyProfile,
    updateOwnEmailViaEdge,
} from "@/services/profileService"; // <- sesuaikan path-nya

// Regex email longgar & realistis
const EMAIL_REGEX =
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

type FormShape = {
    fullName: string;
    email: string;
    village: string;
    landAreaHa: string;
    motherName?: string;
    password?: string;
};

export default function ProfileScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const router = useRouter();
    const C = Colors[scheme];
    const S = Tokens;

    const { profile, user, deleteSelf, signOut } = useAuth();

    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const isHaveMotherName = !!profile?.mother_name_hash;

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isDirty },
    } = useForm<FormShape>({
        defaultValues: {
            fullName: "",
            email: "",
            village: "",
            landAreaHa: "",
            motherName: "",
            password: "",
        },
        mode: "onChange",
    });

    // hydrate form HANYA sekali supaya input user tidak ketimpa setelah edit
    const didHydrate = useRef(false);

    // Sumber kebenaran email: session auth
    const currentEmail = user?.email ?? "";

    useEffect(() => {
        if (!profile) return;
        if (didHydrate.current) return;

        reset({
            fullName: profile.full_name ?? "",
            email: currentEmail, // dari auth
            village: profile.nama_desa ?? "",
            landAreaHa: profile.luas_lahan != null ? String(profile.luas_lahan) : "",
            motherName: "",
            password: "",
        });

        didHydrate.current = true;
    }, [profile, currentEmail, reset]);

    const onSave = async (v: FormShape) => {
        const ha = parseFloat((v.landAreaHa || "").toString().replace(",", "."));

        try {
            setLoading(true);

            // 1) Update profil umum
            await updateMyProfile({
                full_name: v.fullName.trim(),
                nama_desa: v.village.trim(),
                luas_lahan: Number.isFinite(ha) && ha >= 0 ? ha : 0,
            });

            let changedMother = false;
            let changedPwd = false;
            let changedEmail = false;

            // 2) Ubah password (opsional)
            const newPassword = (v.password || "").trim();
            if (newPassword.length > 0) {
                await changeMyPassword(newPassword);
                setValue("password", "");
                changedPwd = true;
            }

            // 3) Ubah email (opsional)
            const inputEmail = (v.email || "").trim();
            if (!EMAIL_REGEX.test(inputEmail)) {
                throw new Error("Format email tidak valid");
            }
            const newEmail = inputEmail.toLowerCase();

            const currentEmail = user?.email ?? ""; // sumber kebenaran
            if (newEmail && newEmail !== currentEmail) {
                await updateOwnEmailViaEdge(newEmail);
                setValue("email", newEmail, { shouldDirty: false });
                changedEmail = true;
            }

            // 4) Ubah Nama Ibu via RPC (opsional)
            const pendingAnswer = (v.motherName || "").trim();
            if (pendingAnswer.length > 0) {
                const uid = user?.id;
                if (!uid) throw new Error("Session tidak valid: user.id tidak ditemukan");

                const { error: rpcErr } = await supabase.rpc("set_mother_name", {
                    p_user_id: uid,
                    p_answer: pendingAnswer,
                });

                if (rpcErr) {
                    // beri pesan jelas; jangan bocorkan detail DB
                    throw new Error("Gagal menyimpan Nama Ibu");
                }

                // kosongkan field agar tidak tetap ‘dirty’
                setValue("motherName", "", { shouldDirty: false });
                changedMother = true;
            }

            Keyboard.dismiss();

            // 5) Pesan notifikasi ringkas sesuai kombinasi perubahan
            let msg = "Profil berhasil diperbarui.";
            if (changedEmail && changedPwd && changedMother) msg = "Profil, email, password & nama ibu diperbarui.";
            else if (changedEmail && changedPwd) msg = "Profil, email & password diperbarui.";
            else if (changedEmail && changedMother) msg = "Profil, email & nama ibu diperbarui.";
            else if (changedPwd && changedMother) msg = "Profil, password & nama ibu diperbarui.";
            else if (changedEmail) msg = "Profil & email diperbarui.";
            else if (changedPwd) msg = "Profil & password diperbarui.";
            else if (changedMother) msg = "Profil & nama ibu diperbarui.";

            Alert.alert("Tersimpan", msg);
        } catch (e: any) {
            console.warn(e);
            Alert.alert("Gagal", e?.message ?? "Tidak dapat menyimpan profil.");
        } finally {
            setLoading(false);
        }
    };


    const onDelete = useCallback(() => {
        Alert.alert(
            "Hapus Pengguna?",
            "Tindakan ini tidak dapat dibatalkan.",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteSelf();
                            await signOut()
                        } catch (e: any) {
                            console.log(e);
                            Alert.alert("Gagal", e?.message ?? "Tidak dapat menghapus pengguna.");
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    }, [deleteSelf]);

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
                        onPress={() => router.replace("/(tabs)")}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <View>
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>Profil</Text>
                        <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                            Perbarui data akunmu.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <KeyboardAwareScrollView
                contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl + 64 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
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
                        scheme === "light" ? S.shadow.light : S.shadow.dark,
                    ]}
                >
                    {/* Avatar + Nama */}
                    <View style={styles.avatarRow}>
                        <View
                            style={[
                                styles.avatarWrap,
                                { borderColor: C.border, backgroundColor: C.surfaceSoft },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            <Text
                                style={{
                                    color: C.text,
                                    fontFamily: Fonts.rounded as any,
                                    fontSize: 16,
                                    fontWeight: "bold",
                                }}
                            >
                                {getInitialsName(profile?.full_name || "")}
                            </Text>
                        </View>

                        <View style={{ flex: 1 }}>
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
                                                color: C.text,
                                                borderColor: errors.fullName ? C.danger : C.border,
                                                borderRadius: S.radius.md,
                                            },
                                        ]}
                                    />
                                )}
                            />
                            {errors.fullName && <Text style={[styles.err, { color: C.danger }]}>{errors.fullName.message}</Text>}
                        </View>
                    </View>

                    {/* Email (EDITABLE) — sumber kebenaran: auth.user.email */}
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
                                value={value}
                                onBlur={onBlur}
                                onChangeText={(t) => onChange(t)} // jangan paksa lower-case di onChange
                                placeholder="nama@contoh.com"
                                placeholderTextColor={C.icon}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="email"
                                textContentType="username"
                                keyboardType="email-address"
                                style={[
                                    styles.input,
                                    {
                                        color: C.text,
                                        borderColor: errors.email ? C.danger : C.border,
                                        borderRadius: S.radius.md,
                                    },
                                ]}
                            />
                        )}
                    />
                    {errors.email && <Text style={[styles.err, { color: C.danger }]}>{errors.email.message as string}</Text>}

                    {/* Nama Ibu (opsional, bila kamu pakai RPC set_mother_name kembali tinggal aktifkan) */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                        Nama Ibu Kandung (untuk verifikasi reset password)
                    </Text>
                    <Controller
                        control={control}
                        name="motherName"
                        rules={{
                            validate: (v) => {
                                if (!v) return true;
                                return String(v).trim().length >= 2 || "Minimal 2 karakter";
                            },
                        }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                placeholder={`${isHaveMotherName ? "Kosongkan jika tidak ingin mengubah" : "Anda belum memasukkan nama ibu"}`}
                                placeholderTextColor={C.icon}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value as any}
                                style={[
                                    styles.input,
                                    {
                                        color: C.text,
                                        borderColor: errors.motherName ? C.danger : C.border,
                                        borderRadius: S.radius.md,
                                    },
                                ]}
                            />
                        )}
                    />
                    {errors.motherName && <Text style={[styles.err, { color: C.danger }]}>{errors.motherName.message}</Text>}

                    {/* Password baru */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Password baru (opsional)</Text>
                    <Controller
                        control={control}
                        name="password"
                        rules={{
                            validate: (v) => !v || v.length >= 6 || "Jika diisi, minimal 6 karakter",
                        }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={{ position: "relative" }}>
                                <TextInput
                                    placeholder="Kosongkan jika tidak ingin mengubah"
                                    placeholderTextColor={C.icon}
                                    secureTextEntry={!showPwd}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value as any}
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: errors.password ? C.danger : C.border,
                                            color: C.text,
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
                                    <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.icon} />
                                </Pressable>
                            </View>
                        )}
                    />
                    {errors.password && <Text style={[styles.err, { color: C.danger }]}>{errors.password.message as string}</Text>}

                    {/* Desa/Kelurahan */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Desa/Kelurahan</Text>
                    <Controller
                        control={control}
                        name="village"
                        rules={{ required: "Desa/Kelurahan wajib diisi" }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                placeholder="Nama desa/kelurahan"
                                placeholderTextColor={C.icon}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                style={[
                                    styles.input,
                                    {
                                        color: C.text,
                                        borderColor: errors.village ? C.danger : C.border,
                                        borderRadius: S.radius.md,
                                    },
                                ]}
                            />
                        )}
                    />
                    {errors.village && <Text style={[styles.err, { color: C.danger }]}>{errors.village.message}</Text>}

                    {/* Luas Lahan */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Luas Lahan (ha)</Text>
                    <Controller
                        control={control}
                        name="landAreaHa"
                        rules={{
                            required: "Luas lahan wajib diisi",
                            validate: (v) => {
                                const n = parseFloat((v || "").toString().replace(",", "."));
                                return !(Number.isNaN(n) || n < 0) || "Harus angka ≥ 0";
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
                                        color: C.text,
                                        borderColor: errors.landAreaHa ? C.danger : C.border,
                                        borderRadius: S.radius.md,
                                    },
                                ]}
                            />
                        )}
                    />
                    {errors.landAreaHa && <Text style={[styles.err, { color: C.danger }]}>{errors.landAreaHa.message}</Text>}
                </View>

                <View style={{ flexDirection: "row", gap: 12, marginTop: S.spacing.lg }}>
                    {/* Simpan */}
                    <Pressable
                        onPress={handleSubmit(onSave)}
                        disabled={loading || !isDirty}
                        style={({ pressed }) => [
                            styles.button,
                            {
                                flex: 1,
                                backgroundColor: C.tint,
                                borderRadius: S.radius.md,
                                opacity: pressed || loading ? 0.85 : 1,
                            },
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={18} color="#fff" />
                                <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>
                                    {isDirty ? "Simpan" : "Tidak ada perubahan"}
                                </Text>
                            </>
                        )}
                    </Pressable>

                    {/* Hapus akun */}
                    <Pressable
                        onPress={onDelete}
                        disabled={loading}
                        style={({ pressed }) => [
                            styles.button,
                            {
                                backgroundColor: C.danger,
                                borderRadius: S.radius.md,
                                opacity: pressed || loading ? 0.85 : 1,
                                paddingHorizontal: 14,
                            },
                        ]}
                    >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                        <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>Hapus</Text>
                    </Pressable>
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
    subtitle: { fontSize: 12, marginTop: 2 },

    card: { padding: 16, borderWidth: 1 },
    avatarRow: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 6 },
    avatarWrap: {
        justifyContent: "center",
        alignItems: "center",
        width: 86,
        height: 86,
        borderRadius: 86,
        overflow: "hidden",
        borderWidth: 1,
        position: "relative",
    },

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
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { RegisterForm } from "@/types/profile";
import { getInitialsName } from "@/utils/getInitialsName";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
    useColorScheme
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const router = useRouter();
    const C = Colors[scheme];
    const S = Tokens;
    const { profile, updateProfile, user, deleteSelf } = useAuth();
    const [loading, setLoading] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isDirty },
    } = useForm<RegisterForm>({
        defaultValues: {
            fullName: "",
            email: "",
            village: "",
            landAreaHa: "",
            motherName: "",
        } as any,
        mode: "onChange",
    });

    useEffect(() => {
        if (!profile) return;
        reset({
            fullName: profile.full_name ?? "",
            email: profile.email ?? "",
            village: profile.nama_desa ?? "",
            landAreaHa: profile.luas_lahan != null ? String(profile.luas_lahan) : "",
            motherName: "",
        } as any);
    }, [profile, reset]);

    const onSave = async (v: RegisterForm) => {
        const ha = parseFloat((v.landAreaHa || "").toString().replace(",", "."));
        try {
            setLoading(true);
            await updateProfile({
                full_name: v.fullName.trim(),
                nama_desa: v.village.trim(),
                luas_lahan: Number.isFinite(ha) && ha >= 0 ? ha : 0,
            });
            const newMother = (v.motherName ?? "").trim();
            if (newMother.length > 0) {
                if (!user?.id) throw new Error("User belum masuk.");
                const { error: rpcErr } = await supabase.rpc("set_mother_name", {
                    p_user_id: user.id,
                    p_answer: newMother,
                });
                if (rpcErr) throw new Error(rpcErr.message);
                setValue("motherName", "");
            }

            Keyboard.dismiss();
            Alert.alert("Tersimpan", newMother ? "Profil & nama ibu diperbarui." : "Profil berhasil diperbarui.");
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
    }, [deleteSelf, router]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header gradien */}
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
                {/* Kartu profil */}
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
                    {/* Avatar */}
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
                                    fontWeight: "bold"
                                }}>
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

                    {/* Email (read-only) */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Email</Text>
                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { value } }) => (
                            <TextInput
                                value={value}
                                editable={false}
                                placeholder="nama@contoh.com"
                                placeholderTextColor={C.icon}
                                style={[
                                    styles.input,
                                    {
                                        color: C.text,
                                        borderColor: C.border,
                                        borderRadius: S.radius.md,
                                        opacity: 0.8,
                                    },
                                ]}
                            />
                        )}
                    />

                    {/* Nama Ibu (opsional, jika diisi akan mengganti hash) */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                        Nama Ibu (untuk verifikasi reset password)
                    </Text>
                    <Controller
                        control={control}
                        name="motherName"
                        rules={{
                            validate: (v) => {
                                if (!v) return true; // opsional
                                return String(v).trim().length >= 2 || "Minimal 2 karakter";
                            },
                        }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                placeholder="Isi hanya jika ingin mengubah"
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

                    {/* Luas Lahan (ha) */}
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
                    {/* Tombol simpan */}
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
        width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center",
    },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2 },

    card: { padding: 16, borderWidth: 1 },
    avatarRow: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 6 },
    avatarWrap: {
        justifyContent: "center", alignItems: "center",
        width: 86, height: 86, borderRadius: 86, overflow: "hidden", borderWidth: 1, position: "relative",
    },
    avatar: { width: "100%", height: "100%" },
    label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
    input: {
        borderWidth: 1, fontSize: 15, paddingHorizontal: 12,
        paddingVertical: Platform.select({ ios: 10, android: 8 }) as number,
        backgroundColor: "transparent",
    },
    err: { marginTop: 6, fontSize: 12 },
    selectInput: {
        borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    button: {
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

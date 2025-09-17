import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { CROP_OPTIONS, RegisterForm } from "@/types/profile";
import { getInitialsName } from "@/utils/getInitialsName";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
    const { profile, updateProfile, loading } = useAuth();
    const [showCrop, setShowCrop] = useState(false);
    const {
        control,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isDirty },
    } = useForm<RegisterForm>({
        defaultValues: {
            fullName: "",
            email: "",
            village: "",
            cropType: "",
            cropTypeOther: "",
            landAreaHa: "",
        },
        mode: "onChange",
    });

    // Hydrate form dari AuthContext.profile
    useEffect(() => {
        if (!profile) return;
        reset({
            fullName: profile.full_name ?? "",
            email: profile.email ?? "",
            village: profile.nama_desa ?? "",
            cropType: profile.jenis_tanaman || "",
            cropTypeOther: "",
            landAreaHa: profile.luas_lahan != null ? String(profile.luas_lahan) : "",
        });
    }, [profile, reset]);

    const cropTypeValue = watch("cropType");
    const isOther = cropTypeValue === "Lainnya";

    const onSave = async (v: RegisterForm) => {
        const finalCrop = v.cropType === "Lainnya" ? (v.cropTypeOther || "").trim() : v.cropType;
        const ha = parseFloat((v.landAreaHa || "").toString().replace(",", "."));
        try {
            await updateProfile({
                full_name: v.fullName.trim(),
                nama_desa: v.village.trim(),
                jenis_tanaman: finalCrop,
                luas_lahan: ha,
            });
            Keyboard.dismiss();
            Alert.alert("Tersimpan", "Profil berhasil diperbarui.");
        } catch (e: any) {
            console.warn(e)
            Alert.alert("Gagal", e?.message ?? "Tidak dapat menyimpan profil.");
        }
    };

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
                        onPress={() => router.push("/(tabs)")}
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

                    {/* Jenis Tanaman — Select (dengan 'Lainnya') */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Jenis Tanaman</Text>
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
                                    <Ionicons name={showCrop ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
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
                                                    setValue("cropType", item, { shouldValidate: true, shouldDirty: true });
                                                    if (item !== "Lainnya") setValue("cropTypeOther", "", { shouldDirty: true });
                                                    setShowCrop(false);
                                                }}
                                                style={({ pressed }) => [
                                                    styles.dropdownItem,
                                                    {
                                                        backgroundColor: pressed ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
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
                    {errors.cropType && <Text style={[styles.err, { color: C.danger }]}>{errors.cropType.message}</Text>}

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

                {/* Tombol simpan */}
                <Pressable
                    onPress={handleSubmit(onSave)}
                    disabled={loading || !isDirty}
                    style={({ pressed }) => [
                        styles.saveBtn,
                        {
                            backgroundColor: loading ? C.tint + "CC" : C.tint,
                            borderRadius: S.radius.lg,
                            opacity: pressed ? 0.98 : 1,
                            shadowColor: "#000",
                        },
                        scheme === "light" ? S.shadow.light : S.shadow.dark,
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={18} color="#fff" />
                            <Text style={[styles.saveText, { fontFamily: Fonts.rounded as any }]}>
                                {isDirty ? "Simpan" : "Tidak ada perubahan"}
                            </Text>
                        </>
                    )}
                </Pressable>
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
    dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 8 },
    dropdownItem: {
        paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 8,
    },

    saveBtn: {
        marginTop: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
    },
    saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

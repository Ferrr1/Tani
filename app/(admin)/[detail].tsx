import Chip from "@/components/Chip";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { AdminUserRow, useAdminUserService } from "@/services/adminUserService";
import { DetailForm } from "@/types/detail-admin";
import { CROP_OPTIONS, Role } from "@/types/profile";
import { EMAIL_REGEX } from "@/types/regex";
import { getInitialsName } from "@/utils/getInitialsName";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

export default function AdminUserDetail() {
    const { detail } = useLocalSearchParams<{ detail: string }>();
    const userId = detail;

    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const { getUserById, updateUser } = useAdminUserService();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [role, setRole] = useState<Role>("user");
    const [showPwd, setShowPwd] = useState(false);
    const [showCrop, setShowCrop] = useState(false);

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<DetailForm>({
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

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const row = (await getUserById(userId)) as AdminUserRow | null;
            if (!row) {
                Alert.alert("Tidak ditemukan", "Pengguna tidak ditemukan.");
                router.back();
                return;
            }
            const fetchedRole = row.role === "admin" ? "admin" : "user";
            setRole(fetchedRole);

            reset({
                fullName: row.full_name ?? "",
                email: row.email ?? "",
                password: "",
                village: row.nama_desa ?? "",
                cropType: inferCropType(row.jenis_tanaman) ?? "",
                cropTypeOther: inferCropTypeOther(row.jenis_tanaman) ?? "",
                landAreaHa: row.luas_lahan != null ? String(row.luas_lahan) : "",
            });
        } catch (e: any) {
            console.log(e);
            Alert.alert("Gagal memuat", e?.message ?? "Terjadi kesalahan saat memuat data.");
            router.back();
        } finally {
            setLoading(false);
        }
    }, [userId, getUserById, router, reset]);

    useEffect(() => {
        load();
    }, [load]);

    const onSubmit = async (v: DetailForm) => {
        if (!userId) return;
        setSaving(true);
        try {
            const finalCrop =
                v.cropType === "Lainnya" ? (v.cropTypeOther || "").trim() : v.cropType;
            const luas = parseFloat((v.landAreaHa || "").toString().replace(",", "."));
            if (Number.isNaN(luas) || luas <= 0) {
                Alert.alert("Data tidak valid", "Luas lahan harus angka > 0");
                setSaving(false);
                return;
            }

            await updateUser({
                targetUserId: userId,
                newEmail: v.email.trim(),
                newPassword: (v.password || "").trim() ? v.password : undefined,
                newFullName: v.fullName.trim(),
                newNamaDesa: v.village.trim(),
                newJenisTanaman: finalCrop,
                newLuasLahan: luas,
                newRole: role
            });

            Alert.alert("Tersimpan", "Profil pengguna berhasil diperbarui.");
            router.back();
        } catch (e: any) {
            console.log(e);
            Alert.alert("Gagal menyimpan", e?.message ?? "Terjadi kesalahan.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color={C.tint} size={"large"} />
                <Text style={{ marginTop: 8, color: C.textMuted }}>Memuat data…</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <KeyboardAwareScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                enableOnAndroid
                enableAutomaticScroll
                extraScrollHeight={Platform.select({ ios: 80, android: 200 })}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <LinearGradient
                    colors={[C.gradientFrom, C.gradientTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
                >
                    <View style={styles.headerRow}>
                        <Pressable
                            onPress={() => router.back()}
                            style={({ pressed }) => [
                                styles.iconBtn,
                                { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                            ]}
                        >
                            <Ionicons name="arrow-back" size={18} color={C.text} />
                        </Pressable>
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Edit Pengguna
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>
                </LinearGradient>

                <View
                    style={[
                        styles.card,
                        { borderColor: C.border, backgroundColor: C.surface, borderRadius: S.radius.lg, margin: S.spacing.lg },
                        scheme === "light" ? S.shadow.light : S.shadow.dark,
                    ]}
                >
                    {/* Avatar + Nama singkat */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <View style={[styles.bigAvatar, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}>
                            <Text style={{ color: C.text, fontSize: 18, fontWeight: "900" }}>
                                {getInitialsName(watch("fullName") || watch("email") || "U")}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: C.textMuted, fontSize: 12 }}>ID #{userId}</Text>
                            <Text style={{ color: C.text, fontSize: 16, fontWeight: "900" }}>
                                {watch("fullName") || "-"}
                            </Text>
                        </View>
                    </View>

                    {/* === Form (mirip register) === */}
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
                                        borderRadius: S.radius.md,
                                        paddingHorizontal: S.spacing.md,
                                        paddingVertical: 10,
                                    },
                                ]}
                            />
                        )}
                    />
                    {errors.email && (
                        <Text style={[styles.err, { color: C.danger }]}>{errors.email.message as string}</Text>
                    )}

                    {/* Password (opsional) */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                        Password (opsional)
                    </Text>
                    <Controller
                        control={control}
                        name="password"
                        rules={{
                            validate: (v) =>
                                !v || v.length >= 6 || "Jika diisi, minimal 6 karakter",
                        }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={{ position: "relative" }}>
                                <TextInput
                                    placeholder="Kosongkan jika tidak ingin mengubah"
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
                                    <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.icon} />
                                </Pressable>
                            </View>
                        )}
                    />
                    {errors.password && (
                        <Text style={[styles.err, { color: C.danger }]}>{errors.password.message as string}</Text>
                    )}

                    {/* Role */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                        Role
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Chip label="User" active={role === "user"} onPress={() => setRole("user")} C={C} />
                        <Chip label="Admin" active={role === "admin"} onPress={() => setRole("admin")} C={C} />
                    </View>
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
                                        borderRadius: S.radius.md,
                                        paddingHorizontal: S.spacing.md,
                                        paddingVertical: 10,
                                    },
                                ]}
                            />
                        )}
                    />
                    {errors.village && (
                        <Text style={[styles.err, { color: C.danger }]}>{errors.village.message as string}</Text>
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
                        <Text style={[styles.err, { color: C.danger }]}>{errors.cropType.message as string}</Text>
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
                                                borderColor: errors.cropTypeOther ? C.danger : C.border,
                                                color: C.text,
                                                borderRadius: S.radius.md,
                                                paddingHorizontal: S.spacing.md,
                                                paddingVertical: 10,
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
                                        borderRadius: S.radius.md,
                                        paddingHorizontal: S.spacing.md,
                                        paddingVertical: 10,
                                    },
                                ]}
                            />
                        )}
                    />
                    {errors.landAreaHa && (
                        <Text style={[styles.err, { color: C.danger }]}>{errors.landAreaHa.message as string}</Text>
                    )}

                    {/* Save */}
                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={saving}
                        style={({ pressed }) => [
                            styles.button,
                            {
                                backgroundColor: C.tint,
                                borderRadius: S.radius.md,
                                opacity: pressed || saving ? 0.85 : 1,
                                marginTop: S.spacing.lg,
                            },
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={18} color="#fff" />
                                <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>
                                    Simpan Perubahan
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

function inferCropType(jenis?: string | null) {
    if (!jenis) return "";
    return CROP_OPTIONS.includes(jenis) ? jenis : "Lainnya";
}

function inferCropTypeOther(jenis?: string | null) {
    if (!jenis) return "";
    return CROP_OPTIONS.includes(jenis) ? "" : jenis;
}

/** ===== Styles ===== */
const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 18, fontWeight: "800" },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },

    card: { padding: 16, borderWidth: 1 },

    bigAvatar: { width: 56, height: 56, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },

    label: { fontSize: 13, marginBottom: 6, fontWeight: "600" },
    input: { borderWidth: 1, fontSize: 15, backgroundColor: "transparent" },
    selectInput: { borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

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

    button: {
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

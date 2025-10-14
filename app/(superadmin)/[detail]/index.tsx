// app/(superadmin)/users/[detail].tsx (atau lokasi komponen detail kamu)
import Chip from "@/components/Chip";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { SuperAdminUserRow, useSuperAdminUserService } from "@/services/superAdminService";
import { DetailForm } from "@/types/detail-admin";
import { Role } from "@/types/profile";
import { EMAIL_REGEX } from "@/types/regex";
import { getInitialsName } from "@/utils/getInitialsName";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    const { detail } = useLocalSearchParams<{ detail?: string }>();
    const userId = detail && detail !== "new" ? detail : undefined;
    const isCreate = !userId; // "new" atau tanpa param → create

    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();
    const { signOut } = useAuth();
    const { getUserById, createUser, updateUser, deleteUser } =
        useSuperAdminUserService();

    const [loading, setLoading] = useState(!isCreate);
    const [saving, setSaving] = useState(false);
    const [role, setRole] = useState<Role>("user");
    const [showPwd, setShowPwd] = useState(false);
    const isUserRole = role === "user";

    const {
        control,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<DetailForm>({
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            village: "",
            landAreaHa: "",
        },
        mode: "onChange",
    });

    // ===== LOAD (edit only)
    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const row = (await getUserById(userId)) as SuperAdminUserRow | null;
            if (!row) {
                Alert.alert("Tidak ditemukan", "Pengguna tidak ditemukan.");
                router.back();
                return;
            }
            const fetchedRole: Role =
                row.role === "superadmin" ? "superadmin" : row.role === "admin" ? "admin" : "user";
            setRole(fetchedRole);

            reset({
                fullName: row.full_name ?? "",
                email: row.email ?? "",
                password: "",
                village: row.nama_desa ?? "",
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
        if (!isCreate) load();
    }, [isCreate, load]);

    // ===== Submit
    const onSubmit = async (v: DetailForm) => {
        setSaving(true);
        try {
            if (isCreate) {
                // Validasi create: password wajib
                const pwd = (v.password || "").trim();
                if (pwd.length < 6) {
                    Alert.alert("Validasi", "Password minimal 6 karakter.");
                    setSaving(false);
                    return;
                }

                // Luas lahan hanya relevan untuk role "user"
                let luas: number | undefined = undefined;
                if (role === "user") {
                    const parsed = parseFloat((v.landAreaHa || "").toString().replace(",", "."));
                    if (Number.isNaN(parsed) || parsed <= 0) {
                        Alert.alert("Data tidak valid", "Luas lahan harus angka > 0");
                        setSaving(false);
                        return;
                    }
                    luas = parsed;
                }

                await createUser({
                    email: v.email.trim(),
                    password: pwd,
                    fullName: v.fullName.trim(),
                    namaDesa: v.village.trim(),
                    luasLahan: luas, // ignored by server if role != 'user'
                    role,
                });

                Alert.alert("Berhasil", "User baru berhasil dibuat.");
                router.back();
                return;
            }

            // UPDATE
            if (!userId) return;

            let luas: number | undefined = undefined;
            if (role === "user") {
                const parsed = parseFloat((v.landAreaHa || "").toString().replace(",", "."));
                if (Number.isNaN(parsed) || parsed <= 0) {
                    Alert.alert("Data tidak valid", "Luas lahan harus angka > 0");
                    setSaving(false);
                    return;
                }
                luas = parsed;
            }

            await updateUser({
                targetUserId: userId,
                newEmail: v.email.trim(),
                newPassword: (v.password || "").trim() ? v.password : undefined,
                newFullName: v.fullName.trim(),
                newNamaDesa: v.village.trim(),
                newLuasLahan: luas, // server akan set null jika role != 'user'
                newRole: role,
            });

            Alert.alert("Tersimpan", "Profil pengguna berhasil diperbarui.");
            router.back();
        } catch (e: any) {
            console.log(e);
            Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan.");
        } finally {
            setSaving(false);
        }
    };

    // ===== Delete (edit only)
    const onDelete = useCallback(() => {
        if (!userId) return;
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
                            setSaving(true);
                            const { selfDelete } = await deleteUser(userId);
                            if (selfDelete) await signOut(); else { Alert.alert("Terhapus", "Pengguna berhasil dihapus."); router.back(); }
                        } catch (e: any) {
                            console.log(e);
                            Alert.alert("Gagal", e?.message ?? "Tidak dapat menghapus pengguna.");
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    }, [deleteUser, router, userId]);

    // ===== UI bits
    const headerTitle = isCreate ? "Buat Pengguna" : "Edit Pengguna";
    const initials = useMemo(
        () => getInitialsName(watch("fullName") || watch("email") || "U"),
        [watch]
    );

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
                            {headerTitle}
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
                            <Text style={{ color: C.text, fontSize: 18, fontWeight: "900" }}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: C.text, fontSize: 16, fontWeight: "900" }}>
                                {watch("fullName") || "-"}
                            </Text>
                        </View>
                    </View>

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
                    {errors.fullName && <Text style={[styles.err, { color: C.danger }]}>{errors.fullName.message}</Text>}

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
                    {errors.email && <Text style={[styles.err, { color: C.danger }]}>{errors.email.message as string}</Text>}

                    {/* Password */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                        Password {isCreate ? "" : "(opsional)"}
                    </Text>
                    <Controller
                        control={control}
                        name="password"
                        rules={{
                            validate: (v) => (isCreate ? (v && v.length >= 6) || "Minimal 6 karakter" : !v || v.length >= 6 || "Jika diisi, minimal 6 karakter"),
                        }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={{ position: "relative" }}>
                                <TextInput
                                    placeholder={isCreate ? "Wajib diisi (min. 6)" : "Kosongkan jika tidak ingin mengubah"}
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
                    {errors.password && <Text style={[styles.err, { color: C.danger }]}>{errors.password.message as string}</Text>}

                    {/* Role */}
                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Role</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Chip label="User" active={role === "user"} onPress={() => setRole("user")} C={C} />
                        <Chip label="Admin" active={role === "admin"} onPress={() => setRole("admin")} C={C} />
                        <Chip label="Super Admin" active={role === "superadmin"} onPress={() => setRole("superadmin")} C={C} />
                    </View>



                    {/* Luas Lahan hanya untuk role user */}
                    {role === "user" && (
                        <>
                            {/* Nama Desa/Kelurahan */}
                            <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Nama Desa/Kelurahan</Text>
                            <Controller
                                control={control}
                                name="village"
                                rules={{
                                    required: isUserRole ? "Nama Desa/Kelurahan wajib diisi" : false,
                                }}
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
                            {errors.village && <Text style={[styles.err, { color: C.danger }]}>{errors.village.message as string}</Text>}

                            <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Luas Lahan (hektar)</Text>
                            <Controller
                                control={control}
                                name="landAreaHa"
                                rules={{
                                    required: isUserRole ? "Luas lahan wajib diisi" : false,
                                    validate: (v) => {
                                        if (!isUserRole) return true; // tidak wajib dan tidak divalidasi
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
                        </>
                    )}

                    {/* Footer buttons */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: S.spacing.lg }}>
                        {/* Save */}
                        <Pressable
                            onPress={handleSubmit(onSubmit)}
                            disabled={saving}
                            style={({ pressed }) => [
                                styles.button,
                                {
                                    flex: 1,
                                    backgroundColor: C.tint,
                                    borderRadius: S.radius.md,
                                    opacity: pressed || saving ? 0.85 : 1,
                                },
                            ]}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="save-outline" size={18} color="#fff" />
                                    <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>
                                        {isCreate ? "Buat Pengguna" : "Simpan Perubahan"}
                                    </Text>
                                </>
                            )}
                        </Pressable>

                        {/* Delete (edit only) */}
                        {!isCreate && (
                            <Pressable
                                onPress={onDelete}
                                disabled={saving}
                                style={({ pressed }) => [
                                    styles.button,
                                    {
                                        backgroundColor: C.danger,
                                        borderRadius: S.radius.md,
                                        opacity: pressed || saving ? 0.85 : 1,
                                        paddingHorizontal: 14,
                                    },
                                ]}
                            >
                                <Ionicons name="trash-outline" size={18} color="#fff" />
                                <Text style={[styles.btnText, { fontFamily: Fonts.rounded as any }]}>Hapus</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 18, fontWeight: "800" },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },

    card: { padding: 16, borderWidth: 1 },

    bigAvatar: { width: 56, height: 56, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },

    label: { fontSize: 13, marginBottom: 6, fontWeight: "600" },
    input: { borderWidth: 1, fontSize: 15, backgroundColor: "transparent" },

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

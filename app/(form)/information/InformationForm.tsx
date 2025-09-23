// app/(form)/information/informationForm.tsx
import Chip from "@/components/Chip";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useInformationService } from "@/services/informationService";
import { CreateInformationInput } from "@/types/information";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

export default function InformationForm() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    // --- PERSIS seperti IncomeForm: baca param & flag edit
    const { informationId } = useLocalSearchParams<{ informationId?: string }>();
    const isEdit = !!informationId;

    const { createInformation, updateInformation, getInformationById } = useInformationService();

    const [saving, setSaving] = useState(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateInformationInput>({
        defaultValues: { title: "", description: "", note: "", isActive: true },
        mode: "onChange",
    });

    const didHydrateEdit = useRef(false);

    // --- Hydrate EDIT ONLY (sama pola: tunggu rows siap? di sini langsung panggil service)
    useEffect(() => {
        let alive = true;
        const hydrate = async () => {
            if (!isEdit || !informationId) return;
            if (didHydrateEdit.current) return;

            try {
                setInitialLoading(true);
                const row = await getInformationById(informationId);
                if (!alive) return;

                if (!row) {
                    Alert.alert("Tidak ditemukan", "Informasi tidak ditemukan.");
                    router.replace("/(tabs)/information");
                    return;
                }

                reset({
                    title: row.title ?? "",
                    description: row.description ?? "",
                    note: row.note ?? "",
                    isActive: row.is_active ?? true,
                });
                didHydrateEdit.current = true;
            } catch (e: any) {
                if (!alive) return;
                Alert.alert("Gagal", e?.message ?? "Tidak dapat memuat data.");
                router.replace("/(tabs)/information");
            } finally {
                if (alive) setInitialLoading(false);
            }
        };
        hydrate();
        return () => {
            alive = false;
        };
    }, [isEdit, informationId, getInformationById, reset, router]);

    // --- Submit handler (seragam)
    const onSubmit = async (v: CreateInformationInput) => {
        if (!v.title?.trim()) return Alert.alert("Validasi", "Judul wajib diisi.");
        if (!v.description?.trim()) return Alert.alert("Validasi", "Deskripsi wajib diisi.");

        try {
            setSaving(true);
            if (isEdit && informationId) {
                await updateInformation({
                    id: informationId,
                    title: v.title.trim(),
                    description: v.description.trim(),
                    note: v.note?.trim() || null,
                    isActive: !!v.isActive,
                });
            } else {
                await createInformation({
                    title: v.title.trim(),
                    description: v.description.trim(),
                    note: v.note?.trim() || null,
                    isActive: !!v.isActive,
                });
            }
            router.replace("/(tabs)/information");
        } catch (e: any) {
            Alert.alert("Gagal", e?.message ?? "Tidak dapat menyimpan data.");
        } finally {
            setSaving(false);
        }
    };

    const showBlocking = initialLoading;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header gradien (gaya profile) */}
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <View style={{ flexDirection: "row", justifyContent: "flex-start", gap: 12, alignItems: "center" }}>
                    <Pressable
                        onPress={() => router.replace("/(tabs)/information")}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <View>
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            {isEdit ? "Ubah Informasi" : "Informasi"}
                        </Text>
                        <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                            Buat/ubah panduan penggunaan aplikasi.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {showBlocking ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={C.tint} size={"large"} />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan form…</Text>
                </View>
            ) : (
                <KeyboardAwareScrollView
                    contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl + 64 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid
                    enableAutomaticScroll
                    extraScrollHeight={Platform.select({ ios: 80, android: 120 })}
                >
                    {/* Card form (gaya profile) */}
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        {/* Judul */}
                        <Text style={[styles.label, { color: C.text }]}>Judul</Text>
                        <Controller
                            control={control}
                            name="title"
                            rules={{ required: "Wajib diisi", minLength: { value: 3, message: "Minimal 3 karakter" } }}
                            render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                    placeholder="Contoh: Cara menggunakan fitur X"
                                    placeholderTextColor={C.icon}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[
                                        styles.input,
                                        { color: C.text, borderColor: errors.title ? C.danger : C.border, borderRadius: S.radius.md },
                                    ]}
                                />
                            )}
                        />
                        {errors.title && <Text style={[styles.err, { color: C.danger }]}>{errors.title.message as string}</Text>}

                        {/* Deskripsi */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Deskripsi</Text>
                        <Controller
                            control={control}
                            name="description"
                            rules={{ required: "Wajib diisi", minLength: { value: 10, message: "Minimal 10 karakter" } }}
                            render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                    placeholder="Tulis panduan atau deskripsi lengkap di sini…"
                                    placeholderTextColor={C.icon}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                    style={[
                                        styles.input,
                                        styles.textarea,
                                        { color: C.text, borderColor: errors.description ? C.danger : C.border, borderRadius: S.radius.md },
                                    ]}
                                />
                            )}
                        />
                        {errors.description && (
                            <Text style={[styles.err, { color: C.danger }]}>{errors.description.message as string}</Text>
                        )}

                        {/* Visibility / is_active */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>
                            Visibilitas
                        </Text>
                        <Text style={[{ color: C.textMuted, fontSize: 12, marginBottom: 8 }]}>
                            Atur apakah informasi ini ditampilkan ke pengguna di aplikasi.
                        </Text>

                        <Controller
                            control={control}
                            name="isActive"
                            render={({ field: { value, onChange } }) => (
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    <Chip
                                        label="Tampilkan"
                                        active={!!value}
                                        onPress={() => onChange(true)}
                                        C={C}
                                    />
                                    <Chip
                                        label="Sembunyikan"
                                        active={!value}
                                        onPress={() => onChange(false)}
                                        C={C}
                                    />
                                </View>
                            )}
                        />


                        {/* Catatan (opsional) */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Catatan (opsional)</Text>
                        <Controller
                            control={control}
                            name="note"
                            render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                    placeholder="Catatan tambahan (opsional)…"
                                    placeholderTextColor={C.icon}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ""}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    style={[
                                        styles.input,
                                        styles.textareaSmall,
                                        { color: C.text, borderColor: C.border, borderRadius: S.radius.md },
                                    ]}
                                />
                            )}
                        />
                    </View>

                    {/* Tombol simpan (gaya profile) */}
                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={saving}
                        style={({ pressed }) => [
                            styles.saveBtn,
                            { backgroundColor: saving ? C.tint + "CC" : C.tint, borderRadius: S.radius.lg, opacity: pressed ? 0.98 : 1 },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={18} color="#fff" />
                                <Text style={[styles.saveText, { fontFamily: Fonts.rounded as any }]}>
                                    {isEdit ? "Simpan Perubahan" : "Simpan"}
                                </Text>
                            </>
                        )}
                    </Pressable>
                </KeyboardAwareScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2 },

    // card
    card: { padding: 16, borderWidth: 1 },

    // fields
    label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
    input: {
        borderWidth: 1,
        fontSize: 15,
        paddingHorizontal: 12,
        paddingVertical: Platform.select({ ios: 10, android: 8 }) as number,
        backgroundColor: "transparent",
    },
    textarea: { minHeight: 130 },
    textareaSmall: { minHeight: 70 },
    err: { marginTop: 6, fontSize: 12 },

    // save button
    saveBtn: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

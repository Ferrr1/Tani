// app/finance/income/form.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useReceiptService } from "@/services/receiptService";
import { useSeasonList } from "@/services/seasonService";
import { fmtDate, yearOf } from "@/types/date";
import { IncomeFormValues, UNIT_OPTIONS } from "@/types/income";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

export default function IncomeForm() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const { receiptId, seasonId: seasonIdFromQuery } = useLocalSearchParams<{
        receiptId?: string;
        seasonId?: string;
    }>();
    const isEdit = !!receiptId;

    const {
        loading: authLoading,
        createReceipt,
        updateReceipt,
        getReceiptById,
    } = useReceiptService();

    const {
        loading: seasonLoading,
        rows: seasonRows,
        fetchOnce: fetchSeasons,
    } = useSeasonList();

    const [saving, setSaving] = useState(false);
    const [openUnit, setOpenUnit] = useState(false);
    const [openSeason, setOpenSeason] = useState(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<IncomeFormValues>({
        defaultValues: { quantity: "", unit: "", price: "", seasonId: "" },
        mode: "onChange",
    });

    const quantity = watch("quantity");
    const price = watch("price");
    const selSeasonId = watch("seasonId");

    // ===== seasons (terbaru di atas)
    const seasons = useMemo(
        () =>
            [...seasonRows].sort(
                (a, b) =>
                    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasonRows]
    );

    // ===== total (display only; DB hitung sendiri)
    const total = useMemo(() => {
        const q = parseFloat((quantity || "0").replace(",", "."));
        const p = parseFloat((price || "0").replace(",", "."));
        const sum = (Number.isFinite(q) ? q : 0) * (Number.isFinite(p) ? p : 0);
        return Number.isFinite(sum) ? sum : 0;
    }, [quantity, price]);

    const totalText = useMemo(
        () =>
            total.toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
            }),
        [total]
    );

    // ===== guards untuk mencegah overwrite
    const didHydrateEdit = useRef(false);
    const didSetDefaultSeason = useRef(false);

    // fetch seasons sekali
    useEffect(() => {
        fetchSeasons();
    }, [fetchSeasons]);

    // Hydrate EDIT — hanya setelah seasons tersedia
    useEffect(() => {
        let alive = true;
        const hydrate = async () => {
            if (!isEdit || !receiptId) {
                // bukan edit → jangan set flag ini, biarkan default season yang jalan
                return;
            }
            if (!seasons.length || didHydrateEdit.current) return;

            try {
                setInitialLoading(true);
                const row = await getReceiptById(receiptId);
                if (!alive) return;

                if (!row) {
                    Alert.alert("Tidak ditemukan", "Data penerimaan tidak ditemukan.");
                    router.push("/(tabs)/income");
                    return;
                }

                // Reset form sesuai data edit
                reset({
                    quantity: row.quantity != null ? String(row.quantity) : "",
                    unit: row.unit_type ?? "",
                    price: row.unit_price != null ? String(row.unit_price) : "",
                    seasonId: row.season_id ?? seasons[0]?.id ?? "",
                });

                // Setelah edit ter-hydrate, kunci supaya efek default season tidak menimpa
                didHydrateEdit.current = true;
                didSetDefaultSeason.current = true; // pastikan efek default tidak jalan kemudian
            } catch (e: any) {
                if (!alive) return;
                Alert.alert("Gagal", e?.message ?? "Tidak dapat memuat data.");
                router.push("/(tabs)/income");
            } finally {
                if (alive) setInitialLoading(false);
            }
        };
        hydrate();
        return () => {
            alive = false;
        };
    }, [isEdit, receiptId, seasons, getReceiptById, reset, router]);

    // Set DEFAULT season (CREATE only) — sekali saja
    useEffect(() => {
        if (!seasons.length) return;
        if (isEdit) return; // jangan set default saat edit
        if (didSetDefaultSeason.current) return;

        const defaultSeasonId =
            (typeof seasonIdFromQuery === "string" && seasonIdFromQuery) ||
            seasons[0]?.id;

        if (defaultSeasonId) {
            setValue("seasonId", defaultSeasonId, { shouldValidate: true });
            didSetDefaultSeason.current = true;
        }
    }, [seasons, isEdit, seasonIdFromQuery, setValue]);

    // ===== Submit
    const onSubmit = async (v: IncomeFormValues) => {
        const q = parseFloat((v.quantity || "").replace(",", "."));
        const p = parseFloat((v.price || "").replace(",", "."));

        if (!v.unit) return Alert.alert("Validasi", "Pilih jenis satuan dulu.");
        if (!v.seasonId) return Alert.alert("Validasi", "Pilih musim dulu.");
        if (!Number.isFinite(q) || q <= 0)
            return Alert.alert("Validasi", "Kuantitas harus angka > 0.");
        if (!Number.isFinite(p) || p < 0)
            return Alert.alert("Validasi", "Harga/satuan harus angka ≥ 0.");

        try {
            setSaving(true);
            if (isEdit && receiptId) {
                await updateReceipt({
                    id: receiptId,
                    seasonId: v.seasonId,
                    quantity: q,
                    unitType: v.unit,
                    unitPrice: p,
                });
            } else {
                await createReceipt({
                    seasonId: v.seasonId,
                    quantity: q,
                    unitType: v.unit,
                    unitPrice: p,
                });
            }
            router.push("/(tabs)/income");
        } catch (e: any) {
            Alert.alert("Gagal", e?.message ?? "Tidak dapat menyimpan data.");
        } finally {
            setSaving(false);
        }
    };

    const showBlocking =
        initialLoading || (seasonLoading && seasons.length === 0) || authLoading;

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
                        onPress={() => router.push("/(tabs)/income")}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <View>
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            {isEdit ? "Ubah Penerimaan" : "Penerimaan"}
                        </Text>
                        <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                            Catat penerimaan berdasarkan musim.
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
                        {/* Kuantitas */}
                        <Text style={[styles.label, { color: C.text }]}>Kuantitas</Text>
                        <Controller
                            control={control}
                            name="quantity"
                            rules={{
                                required: "Wajib diisi",
                                validate: (v) => {
                                    const n = parseFloat((v || "").toString().replace(",", "."));
                                    return (!Number.isNaN(n) && n > 0) || "Harus angka > 0";
                                },
                            }}
                            render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                    placeholder="contoh: 1000"
                                    placeholderTextColor={C.icon}
                                    keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[
                                        styles.input,
                                        { color: C.text, borderColor: errors.quantity ? C.danger : C.border, borderRadius: S.radius.md },
                                    ]}
                                />
                            )}
                        />
                        {errors.quantity && <Text style={[styles.err, { color: C.danger }]}>{errors.quantity.message as string}</Text>}

                        {/* Jenis Satuan */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Jenis Satuan</Text>
                        <Pressable
                            onPress={() => {
                                setOpenUnit((v) => !v);
                                setOpenSeason(false);
                            }}
                            style={[
                                styles.selectInput,
                                {
                                    borderColor: errors.unit ? C.danger : C.border,
                                    backgroundColor: C.surface,
                                    borderRadius: S.radius.md,
                                    paddingHorizontal: S.spacing.md,
                                    paddingVertical: 12,
                                },
                            ]}
                        >
                            <Controller
                                control={control}
                                name="unit"
                                rules={{ required: "Wajib dipilih" }}
                                render={({ field: { value } }) => (
                                    <Text
                                        style={{
                                            color: value ? C.text : C.icon,
                                            fontFamily: Fonts.sans as any,
                                            fontSize: 15,
                                            fontWeight: "800",
                                        }}
                                    >
                                        {value || "Pilih satuan"}
                                    </Text>
                                )}
                            />
                            <Ionicons name={openUnit ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                        </Pressable>

                        {openUnit && (
                            <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface, borderRadius: 12 }]}>
                                {UNIT_OPTIONS.map((u) => (
                                    <Pressable
                                        key={u}
                                        onPress={() => {
                                            setValue("unit", u, { shouldValidate: true, shouldDirty: true });
                                            setOpenUnit(false);
                                        }}
                                        style={({ pressed }) => [
                                            styles.dropdownItem,
                                            {
                                                backgroundColor: pressed ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                                                borderColor: C.border,
                                            },
                                        ]}
                                    >
                                        <Ionicons name="cube-outline" size={14} color={C.tint} />
                                        <Text style={{ color: C.text, fontWeight: "700" }}>{u}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                        {errors.unit && <Text style={[styles.err, { color: C.danger }]}>{errors.unit.message as string}</Text>}

                        {/* Harga / satuan */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Harga/satuan</Text>
                        <Controller
                            control={control}
                            name="price"
                            rules={{
                                required: "Wajib diisi",
                                validate: (v) => {
                                    const n = parseFloat((v || "").toString().replace(",", "."));
                                    return (!Number.isNaN(n) && n >= 0) || "Harus angka ≥ 0";
                                },
                            }}
                            render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                    placeholder="contoh: 4500"
                                    placeholderTextColor={C.icon}
                                    keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[
                                        styles.input,
                                        { color: C.text, borderColor: errors.price ? C.danger : C.border, borderRadius: S.radius.md },
                                    ]}
                                />
                            )}
                        />
                        {errors.price && <Text style={[styles.err, { color: C.danger }]}>{errors.price.message as string}</Text>}

                        {/* Total (otomatis) */}
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Total</Text>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <View style={[styles.badge, { backgroundColor: scheme === "light" ? "#00000010" : "#ffffff20" }]}>
                                    <Ionicons name="calculator-outline" size={12} color={C.textMuted} />
                                    <Text style={{ fontSize: 10, fontWeight: "800", color: C.textMuted }}>otomatis</Text>
                                </View>
                            </View>
                        </View>
                        <TextInput
                            editable={false}
                            value={totalText}
                            style={[styles.input, { color: C.text, borderColor: C.border, borderRadius: S.radius.md }]}
                        />
                        <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                            Dari <Text style={{ fontWeight: "800" }}>Kuantitas</Text> × <Text style={{ fontWeight: "800" }}>Harga/satuan</Text>
                        </Text>

                        {/* Pilih Musim */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Pilih Musim</Text>
                        <Pressable
                            onPress={() => {
                                setOpenSeason((v) => !v);
                                setOpenUnit(false);
                            }}
                            style={[
                                styles.selectInput,
                                {
                                    borderColor: errors.seasonId ? C.danger : C.border,
                                    backgroundColor: C.surface,
                                    borderRadius: S.radius.md,
                                    paddingHorizontal: S.spacing.md,
                                    paddingVertical: 12,
                                },
                            ]}
                        >
                            <Controller
                                control={control}
                                name="seasonId"
                                rules={{ required: "Wajib dipilih" }}
                                render={({ field: { value } }) => {
                                    const sel = seasons.find((s) => s.id === value);
                                    return (
                                        <Text
                                            style={{
                                                color: sel ? C.text : C.icon,
                                                fontFamily: Fonts.sans as any,
                                                fontSize: 15,
                                                fontWeight: "800",
                                            }}
                                        >
                                            {sel ? `Musim Ke-${sel.season_no} (${yearOf(sel.start_date)})` : "Pilih musim"}
                                        </Text>
                                    );
                                }}
                            />
                            <Ionicons name={openSeason ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                        </Pressable>

                        {openSeason && (
                            <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface, borderRadius: 12 }]}>
                                {seasons.map((s) => (
                                    <Pressable
                                        key={s.id}
                                        onPress={() => {
                                            setValue("seasonId", s.id, { shouldValidate: true, shouldDirty: true });
                                            setOpenSeason(false);
                                        }}
                                        style={({ pressed }) => [
                                            styles.dropdownItem,
                                            {
                                                backgroundColor: pressed ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                                                borderColor: C.border,
                                            },
                                        ]}
                                    >
                                        <Ionicons name="calendar-outline" size={14} color={C.tint} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: C.text, fontWeight: (selSeasonId === s.id ? "800" : "700") as any }}>
                                                Musim Ke-{s.season_no} ({yearOf(s.start_date)})
                                            </Text>
                                            <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                                {fmtDate(s.start_date)} — {fmtDate(s.end_date)}
                                            </Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                        {errors.seasonId && <Text style={[styles.err, { color: C.danger }]}>{errors.seasonId.message as string}</Text>}
                    </View>

                    {/* Tombol simpan (gaya profile) */}
                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={saving || authLoading}
                        style={({ pressed }) => [
                            styles.saveBtn,
                            {
                                backgroundColor: saving ? C.tint + "CC" : C.tint,
                                borderRadius: S.radius.lg,
                                opacity: pressed ? 0.98 : 1,
                            },
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
    iconBtn: {
        width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center",
    },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2 },

    // card
    card: { padding: 16, borderWidth: 1 },

    // fields
    label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
    input: {
        borderWidth: 1, fontSize: 15, paddingHorizontal: 12,
        paddingVertical: Platform.select({ ios: 10, android: 8 }) as number,
        backgroundColor: "transparent",
    },
    err: { marginTop: 6, fontSize: 12 },

    // select styles
    selectInput: {
        borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 8 },
    dropdownItem: {
        paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 8,
    },

    // badge
    badge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    },

    // save button
    saveBtn: {
        marginTop: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
    },
    saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

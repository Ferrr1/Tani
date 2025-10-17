import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useReceiptService } from "@/services/receiptService";
import { useSeasonList } from "@/services/seasonService";
import { IncomeFormValues, UNIT_OPTIONS } from "@/types/income";
import { currency } from "@/utils/currency";
import { formatWithOutYear } from "@/utils/date";
import { toNum } from "@/utils/number"; // <-- helper sudah ada; sesuaikan path jika perlu
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

type ReceiptItemInput = {
    cropName: string;
    qty: string;
    price: string;
    unit: string;
};

type IncomeFormEx = IncomeFormValues & {
    items?: ReceiptItemInput[]; // create mode: 1 baris / crop
};

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
        createReceipt,
        updateReceipt,
        getReceiptById,
        listReceipts,
    } = useReceiptService();

    const getReceiptByIdRef = useRef(getReceiptById);
    const listReceiptsRef = useRef(listReceipts);
    useEffect(() => {
        getReceiptByIdRef.current = getReceiptById;
        listReceiptsRef.current = listReceipts;
    }, [getReceiptById, listReceipts]);

    const {
        loading: seasonLoading,
        rows: seasonRows,
        fetchOnce: fetchSeasons,
    } = useSeasonList();

    const [saving, setSaving] = useState(false);
    const [openSeason, setOpenSeason] = useState(false);
    const [openUnitEdit, setOpenUnitEdit] = useState(false); // unit dropdown untuk EDIT
    const [openUnitIdx, setOpenUnitIdx] = useState<number | null>(null); // unit dropdown untuk baris create
    const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);

    // --- Dipakai-check per (season_id, item_name) ---
    const [usedBySeason, setUsedBySeason] = useState<Map<string, Set<string>>>(new Map());
    const [usedLoading, setUsedLoading] = useState<boolean>(false);
    const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
    const [editingItemName, setEditingItemName] = useState<string | null>(null);
    // ------------------------------------------------

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<IncomeFormEx>({
        defaultValues: { quantity: "", unit: "", price: "", seasonId: "", items: [] },
        mode: "onChange",
    });

    const quantity = watch("quantity");
    const price = watch("price");
    const selSeasonId = watch("seasonId");
    const items = watch("items") ?? [];

    const seasons = useMemo(
        () =>
            [...seasonRows].sort(
                (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasonRows]
    );

    const grandTotal = isEdit
        ? 0
        : (items ?? []).reduce((acc, it) => {
            const sub = Math.max(0, toNum(it.qty) * Math.max(0, toNum(it.price)));
            return acc + sub;
        }, 0);


    const didHydrateEdit = useRef(false);
    const didSetDefaultSeason = useRef(false);

    // fetch seasons sekali
    useEffect(() => {
        fetchSeasons();
    }, [fetchSeasons]);

    // Ambil daftar receipts user → tandai (season_id, item_name) yang sudah terpakai
    const usedReqIdRef = useRef(0);
    useEffect(() => {
        let alive = true;
        const reqId = ++usedReqIdRef.current;

        const loadUsed = async () => {
            setUsedLoading(true);
            try {
                const receipts = await listReceiptsRef.current(); // semua receipts user
                if (!alive || reqId !== usedReqIdRef.current) return;

                const map = new Map<string, Set<string>>();
                (receipts ?? []).forEach((r: any) => {
                    const sid = r?.season_id ? String(r.season_id) : null;
                    if (!sid) return;
                    const item = (r?.item_name ? String(r.item_name) : "").trim().toLowerCase();
                    if (!map.has(sid)) map.set(sid, new Set());
                    if (item) map.get(sid)!.add(item);
                });

                // Saat edit, izinkan pasangan (season_id, item_name) milik row ini
                if (editingSeasonId && editingItemName) {
                    const s = map.get(editingSeasonId);
                    if (s) s.delete(editingItemName.trim().toLowerCase());
                }

                setUsedBySeason(map);
            } catch (e) {
                if (!alive || reqId !== usedReqIdRef.current) return;
                console.warn("loadUsed receipts", e);
            } finally {
                if (!alive || reqId !== usedReqIdRef.current) return;
                setUsedLoading(false);
            }
        };

        loadUsed();
        return () => {
            alive = false;
        };
    }, [editingSeasonId, editingItemName]);

    // Hydrate saat edit — sekali setelah seasons tersedia
    const hydrateReqIdRef = useRef(0);
    useEffect(() => {
        let alive = true;
        const hydrate = async () => {
            if (!isEdit || !receiptId) return;
            if (!seasons.length || didHydrateEdit.current) return;

            const myReq = ++hydrateReqIdRef.current;
            try {
                setInitialLoading(true);

                const row = await getReceiptByIdRef.current(receiptId);
                if (!alive || myReq !== hydrateReqIdRef.current) return;

                if (!row) {
                    Alert.alert("Tidak ditemukan", "Data penerimaan tidak ditemukan.");
                    router.replace("/(tabs)/income");
                    return;
                }

                reset({
                    quantity: row.quantity != null ? String(row.quantity) : "",
                    unit: row.unit_type ?? "",
                    price: row.unit_price != null ? String(row.unit_price) : "",
                    seasonId: row.season_id ?? seasons[0]?.id ?? "",
                    items: [], // tidak dipakai saat edit
                });

                setEditingSeasonId(row.season_id ?? null);
                setEditingItemName((row.item_name ?? "").toString());

                didHydrateEdit.current = true;
                didSetDefaultSeason.current = true;
            } catch (e: any) {
                if (!alive || myReq !== hydrateReqIdRef.current) return;
                Alert.alert("Gagal", e?.message ?? "Tidak dapat memuat data.");
                router.replace("/(tabs)/income");
            } finally {
                if (!alive || myReq !== hydrateReqIdRef.current) return;
                setInitialLoading(false);
            }
        };
        hydrate();
        return () => {
            alive = false;
        };
    }, [isEdit, receiptId, seasons, reset, router]);

    // Set default season saat create:
    // - coba pakai ?seasonId kalau masih punya crop yang belum terpakai
    // - kalau tidak, pilih season pertama yang masih ada crop bebas
    useEffect(() => {
        if (!seasons.length) return;
        if (isEdit) return;
        if (didSetDefaultSeason.current) return;

        const seasonHasFreeCrop = (sid: string | undefined) => {
            if (!sid) return false;
            const s = seasons.find((x) => x.id === sid);
            if (!s) return false;
            const crops: string[] = Array.isArray(s.crop_type) ? s.crop_type : [];
            const used = usedBySeason.get(sid) ?? new Set<string>();
            const free = crops.filter((c) => !used.has(String(c).trim().toLowerCase()));
            return free.length > 0;
        };

        let defaultSeasonId: string | undefined =
            (typeof seasonIdFromQuery === "string" && seasonIdFromQuery) || undefined;

        if (!seasonHasFreeCrop(defaultSeasonId)) {
            const firstFree = seasons.find((s) => seasonHasFreeCrop(s.id));
            defaultSeasonId = firstFree?.id;
        }

        if (defaultSeasonId) {
            setValue("seasonId", defaultSeasonId, { shouldValidate: true });
            didSetDefaultSeason.current = true;
        } else {
            setValue("seasonId", "", { shouldValidate: true });
        }
    }, [seasons, isEdit, seasonIdFromQuery, usedBySeason, setValue]);

    // Ketika season berubah (create), render baris per crop yang MASIH bebas
    useEffect(() => {
        if (isEdit) return;
        if (!selSeasonId) {
            setValue("items", [], { shouldDirty: true, shouldValidate: false });
            return;
        }
        const s = seasons.find((x) => x.id === selSeasonId);
        const crops: string[] = (s && Array.isArray(s.crop_type)) ? s!.crop_type : [];
        const used = usedBySeason.get(selSeasonId) ?? new Set<string>();
        const available = crops.filter((c) => !used.has(String(c).trim().toLowerCase()));

        const nextItems: ReceiptItemInput[] = available.map((c) => ({
            cropName: String(c),
            qty: "",
            price: "",
            unit: "",
        }));

        setValue("items", nextItems, { shouldDirty: true, shouldValidate: false });
        setOpenUnitIdx(null);
    }, [isEdit, selSeasonId, seasons, usedBySeason, setValue]);

    const onSubmit = async (v: IncomeFormEx) => {
        if (!v.seasonId) return Alert.alert("Validasi", "Pilih musim dulu.");

        try {
            setSaving(true);

            if (isEdit && receiptId) {
                // EDIT: tetap single row
                const q = toNum(v.quantity);
                const p = toNum(v.price);
                if (!v.unit) return Alert.alert("Validasi", "Pilih jenis satuan dulu.");
                if (!Number.isFinite(q) || q <= 0) return Alert.alert("Validasi", "Kuantitas harus angka > 0.");
                if (!Number.isFinite(p) || p < 0) return Alert.alert("Validasi", "Harga/satuan harus angka ≥ 0.");

                await updateReceipt({
                    id: receiptId,
                    seasonId: v.seasonId,
                    quantity: q,
                    unitType: v.unit,
                    unitPrice: p,
                    // item_name tidak diubah di mode edit (atau tambahkan kalau kamu ingin)
                });
            } else {
                // CREATE: buat satu receipt per crop yang diisi valid
                const lines = (v.items ?? []).map((it) => ({
                    cropName: it.cropName,
                    qty: toNum(it.qty),
                    price: toNum(it.price),
                    unit: it.unit,
                }));

                const validLines = lines.filter((l) => l.unit && l.qty > 0 && l.price >= 0);
                if (validLines.length === 0) {
                    return Alert.alert("Validasi", "Isi minimal satu baris penerimaan yang valid.");
                }

                for (const row of validLines) {
                    await createReceipt({
                        seasonId: v.seasonId,
                        itemName: row.cropName, // <-- mapping ke kolom item_name
                        quantity: row.qty,
                        unitType: row.unit,
                        unitPrice: row.price,
                    });
                }
            }

            router.replace("/(tabs)/income");
        } catch (e: any) {
            if (e?.code === "23505") {
                Alert.alert("Validasi", "Penerimaan untuk tanaman ini pada musim tersebut sudah ada.");
            } else {
                Alert.alert("Gagal", e?.message ?? "Tidak dapat menyimpan data.");
            }
        } finally {
            setSaving(false);
        }
    };

    const showBlocking =
        initialLoading || (seasonLoading && seasons.length === 0) || usedLoading;

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
                        onPress={() => router.replace("/(tabs)/income")}
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
                            Catat penerimaan berdasarkan musim & jenis tanaman.
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
                    {/* Card form */}
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        {/* Pilih Musim */}
                        <Text style={[styles.label, { color: C.text }]}>Pilih Musim</Text>
                        <Pressable
                            onPress={() => {
                                setOpenSeason((v) => !v);
                                setOpenUnitEdit(false);
                                setOpenUnitIdx(null);
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
                                            {sel
                                                ? `Musim Ke-${sel.season_no} (${sel.season_year ?? "-"})`
                                                : "Pilih musim"}
                                        </Text>
                                    );
                                }}
                            />
                            <Ionicons name={openSeason ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                        </Pressable>

                        {openSeason && (
                            <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface, borderRadius: 12 }]}>
                                {seasons.map((s) => {
                                    const crops: string[] = Array.isArray(s.crop_type) ? s.crop_type : [];
                                    const used = usedBySeason.get(s.id) ?? new Set<string>();
                                    const freeCrops = crops.filter((c) => !used.has(String(c).trim().toLowerCase()));
                                    const disabled = !isEdit && freeCrops.length === 0; // saat create: disable jika semua crop sudah terpakai

                                    return (
                                        <Pressable
                                            key={s.id}
                                            disabled={disabled}
                                            onPress={() => {
                                                setValue("seasonId", s.id, { shouldValidate: true, shouldDirty: true });
                                                setOpenSeason(false);
                                            }}
                                            style={({ pressed }) => [
                                                styles.dropdownItem,
                                                {
                                                    backgroundColor: pressed ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                                                    borderColor: C.border,
                                                    opacity: disabled ? 0.5 : 1,
                                                },
                                            ]}
                                        >
                                            <Ionicons name="calendar-outline" size={14} color={C.tint} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: C.text, fontWeight: (selSeasonId === s.id ? "800" : "700") as any }}>
                                                    Musim Ke-{s.season_no}
                                                    {disabled ? " | Semua tanaman sudah ada penerimaan" : ""}
                                                </Text>
                                                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                                    {formatWithOutYear(s.start_date)} — {formatWithOutYear(s.end_date)} — ({s.season_year ?? "-"})
                                                </Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                        {errors.seasonId && <Text style={[styles.err, { color: C.danger }]}>{errors.seasonId.message as string}</Text>}

                        {/* ===== CREATE MODE: Penerimaan per Tanaman (Array) ===== */}
                        {!isEdit && items.map((it, idx) => {
                            const subtotal = Math.max(0, toNum(it.qty) * Math.max(0, toNum(it.price)));
                            const unitOpen = openUnitIdx === idx;

                            return (
                                <View
                                    key={`${it.cropName}-${idx}`}
                                    style={[
                                        styles.card,
                                        {
                                            backgroundColor: C.surface,
                                            borderColor: C.border,
                                            borderRadius: S.radius.lg,
                                            marginTop: S.spacing.md,
                                        },
                                        scheme === "light" ? S.shadow.light : S.shadow.dark,
                                    ]}
                                >
                                    <Text
                                        style={{
                                            textTransform: "capitalize",
                                            color: C.textMuted,
                                            fontWeight: "800",
                                            fontFamily: Fonts.rounded as any,
                                        }}
                                    >
                                        {`Penerimaan | ${it.cropName} *`}
                                    </Text>

                                    {/* Unit */}
                                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.sm }]}>Jenis Satuan</Text>
                                    <Pressable
                                        onPress={() => {
                                            setOpenUnitIdx(unitOpen ? null : idx);
                                            setOpenSeason(false);
                                            setOpenUnitEdit(false);
                                        }}
                                        style={[
                                            styles.selectInput,
                                            {
                                                borderColor: C.border,
                                                backgroundColor: C.surface,
                                                borderRadius: S.radius.md,
                                                paddingHorizontal: S.spacing.md,
                                                paddingVertical: 12,
                                            },
                                        ]}
                                    >
                                        <Controller
                                            control={control}
                                            name={`items.${idx}.unit` as const}
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
                                        <Ionicons name={unitOpen ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                                    </Pressable>

                                    {unitOpen && (
                                        <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface, borderRadius: 12 }]}>
                                            {UNIT_OPTIONS.map((u) => (
                                                <Pressable
                                                    key={`${u}-${idx}`}
                                                    onPress={() => {
                                                        setValue(`items.${idx}.unit` as const, u, { shouldValidate: true, shouldDirty: true });
                                                        setOpenUnitIdx(null);
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

                                    {/* Qty */}
                                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Jumlah</Text>
                                    <Controller
                                        control={control}
                                        name={`items.${idx}.qty` as const}
                                        rules={{
                                            required: "Wajib diisi",
                                            validate: (v) => toNum(v) > 0 || "Harus > 0",
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
                                                    { color: C.text, borderColor: C.border, borderRadius: S.radius.md },
                                                ]}
                                            />
                                        )}
                                    />

                                    {/* Price */}
                                    <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Harga per satuan</Text>
                                    <Controller
                                        control={control}
                                        name={`items.${idx}.price` as const}
                                        rules={{
                                            required: "Wajib diisi",
                                            validate: (v) => {
                                                const x = toNum(v);
                                                return (!Number.isNaN(x) && x >= 0) || "Harus angka ≥ 0";
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
                                                    { color: C.text, borderColor: C.border, borderRadius: S.radius.md },
                                                ]}
                                            />
                                        )}
                                    />

                                    {/* Subtotal */}
                                    <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>
                                        Subtotal ≈{" "}
                                        <Text style={{ color: C.success, fontWeight: "900" }}>
                                            {subtotal.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                                        </Text>
                                    </Text>
                                </View>
                            );
                        })}

                        {/* ===== EDIT MODE: Field lama (single) ===== */}
                        {isEdit && (
                            <>
                                {/* Kuantitas */}
                                <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Kuantitas</Text>
                                <Controller
                                    control={control}
                                    name="quantity"
                                    rules={{
                                        required: "Wajib diisi",
                                        validate: (v) => {
                                            const n = toNum(v);
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
                                        setOpenUnitEdit((v) => !v);
                                        setOpenSeason(false);
                                        setOpenUnitIdx(null);
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
                                    <Ionicons name={openUnitEdit ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                                </Pressable>

                                {openUnitEdit && (
                                    <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface, borderRadius: 12 }]}>
                                        {UNIT_OPTIONS.map((u) => (
                                            <Pressable
                                                key={u}
                                                onPress={() => {
                                                    setValue("unit", u, { shouldValidate: true, shouldDirty: true });
                                                    setOpenUnitEdit(false);
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
                                            const n = toNum(v);
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
                                    <View style={[styles.badge, { backgroundColor: scheme === "light" ? "#00000010" : "#ffffff20" }]}>
                                        <Ionicons name="calculator-outline" size={12} color={C.textMuted} />
                                        <Text style={{ fontSize: 10, fontWeight: "800", color: C.textMuted }}>otomatis</Text>
                                    </View>
                                </View>
                                <TextInput
                                    editable={false}
                                    value={(() => {
                                        const q = toNum(quantity);
                                        const p = toNum(price);
                                        const sum = (Number.isFinite(q) ? q : 0) * (Number.isFinite(p) ? p : 0);
                                        return (Number.isFinite(sum) ? sum : 0).toLocaleString("id-ID", {
                                            style: "currency",
                                            currency: "IDR",
                                            maximumFractionDigits: 0,
                                        });
                                    })()}
                                    style={[styles.input, { color: C.text, borderColor: C.border, borderRadius: S.radius.md }]}
                                />
                                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                                    Dari <Text style={{ fontWeight: "800" }}>Kuantitas</Text> × <Text style={{ fontWeight: "800" }}>Harga/satuan</Text>
                                </Text>
                            </>
                        )}

                        {/* Grand total untuk CREATE */}
                        {!isEdit && items.length > 0 && (
                            <>
                                {/* Subtotal */}
                                <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>
                                    Total ≈{" "}
                                    <Text style={{ color: C.success, fontWeight: "900" }}>
                                        {currency(grandTotal)}
                                    </Text>
                                </Text>
                            </>
                        )}
                    </View>

                    {/* Tombol simpan */}
                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={saving}
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
    subtitle: { fontSize: 12, marginTop: 2, maxWidth: 300 },
    card: { padding: 16, borderWidth: 1 },
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
    badge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    },
    saveBtn: {
        marginTop: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
    },
    saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

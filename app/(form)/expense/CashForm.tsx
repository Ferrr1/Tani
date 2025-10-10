// CashForm.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import ChemPanel from "@/components/ChemPanel";
import Chip from "@/components/Chip";
import FertilizerPanel from "@/components/FertilizerPanel";
import LaborOne from "@/components/LaborOne";
import RHFLineInput from "@/components/RHFLineInput";
import SectionButton from "@/components/SectionButton";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useExpenseService } from "@/services/expenseService";
import { useSeasonService } from "@/services/seasonService";
import {
    CashFormValues,
    Category,
    ChemItem,
    LaborForm,
    SATUAN_KIMIA,
    SEED_UNIT,
    SEEDLING_UNIT,
    SERVICE_UNIT,
    Unit,
    UNIT_FERTILIZER,
} from "@/types/expense";
import { currency } from "@/utils/currency";

type Mode = "create" | "edit";

type SeedLine = {
    cropName: string;
    kind: "seed" | "seedling";
    name: string;
    qty: string;
    price: string;
};

export default function CashForm({
    seasonId,
    mode = "create",
    expenseId,
}: {
    seasonId: string;
    mode?: Mode;
    expenseId?: string;
}) {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const {
        listCashMaterials,
        listCashLabors,
        listCashExtras,
        createCashExpense,
        updateCashExpense,
    } = useExpenseService();
    const { getSeasonById } = useSeasonService();

    // toggles
    const [openFertilizer, setOpenFertilizer] = useState(false);
    const [openInsect, setOpenInsect] = useState(false);
    const [openHerb, setOpenHerb] = useState(false);
    const [openFungi, setOpenFungi] = useState(false);
    const [openNursery, setOpenNursery] = useState(false);
    const [openLandPrep, setOpenLandPrep] = useState(false);
    const [openPlanting, setOpenPlanting] = useState(false);
    const [openFertLabor, setOpenFertLabor] = useState(false);
    const [openIrrigation, setOpenIrrigation] = useState(false);
    const [openWeeding, setOpenWeeding] = useState(false);
    const [openPestCtrl, setOpenPestCtrl] = useState(false);
    const [openHarvest, setOpenHarvest] = useState(false);
    const [openPostHarvest, setOpenPostHarvest] = useState(false);
    const [openExtras, setOpenExtras] = useState(false);

    // kimia
    const [fertilizerItems, setFertilizerItems] = useState<ChemItem[]>([]);
    const [insectItems, setInsectItems] = useState<ChemItem[]>([]);
    const [herbItems, setHerbItems] = useState<ChemItem[]>([]);
    const [fungiItems, setFungiItems] = useState<ChemItem[]>([]);

    const addChem = (setter: any, item: Omit<ChemItem, "id">) =>
        setter((prev: ChemItem[]) => [
            ...prev,
            { ...item, id: String(Date.now() + Math.random()) },
        ]);

    const defaultLabor = (): LaborForm => ({
        tipe: "harian",
        jumlahOrang: "",
        jumlahHari: "",
        jamKerja: "",
        upahHarian: "",
        hargaBorongan: "",
        upahBerlaku: "",
    });

    // ==== FORM ====
    const { control, handleSubmit, watch, setValue } = useForm<
        CashFormValues & { seeds: SeedLine[] }
    >({
        defaultValues: {
            seeds: [],
            extras: { tax: "", landRent: "", transport: "" },
            labor: {
                nursery: defaultLabor(),
                land_prep: defaultLabor(),
                planting: defaultLabor(),
                fertilizing: defaultLabor(),
                irrigation: defaultLabor(),
                weeding: defaultLabor(),
                pest_ctrl: defaultLabor(),
                harvest: defaultLabor(),
                postharvest: defaultLabor(),
            },
        },
        mode: "onChange",
    });

    const didHydrateEdit = useRef(false);
    const seedsHydrated = useRef(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(mode === "edit");

    // ===== Ambil crops dari season → seeds[] (one-time init per seasonId)
    useEffect(() => {
        let alive = true;
        const init = async () => {
            if (seedsHydrated.current) return;
            try {
                const season = await getSeasonById(seasonId);
                if (!alive) return;

                const current = (watch("seeds") ?? []) as SeedLine[];
                if (current.length > 0) {
                    seedsHydrated.current = true;
                    return;
                }

                const raw = (season?.crop_type ?? "") as any;
                const names: string[] = Array.isArray(raw)
                    ? raw
                    : String(raw)
                        .split(/[\/|,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean);

                const seeds: SeedLine[] =
                    names.length > 0
                        ? names.map((nm) => ({
                            cropName: nm,
                            kind: "seed",
                            name: "",
                            qty: "",
                            price: "",
                        }))
                        : [
                            { cropName: "Tanaman", kind: "seed", name: "", qty: "", price: "" },
                        ];

                setValue("seeds", seeds, { shouldDirty: false });
                seedsHydrated.current = true;
            } catch {
                const current = (watch("seeds") ?? []) as SeedLine[];
                if (current.length === 0) {
                    setValue(
                        "seeds",
                        [{ cropName: "Tanaman", kind: "seed", name: "", qty: "", price: "" }],
                        { shouldDirty: false }
                    );
                }
                seedsHydrated.current = true;
            }
        };
        init();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seasonId]);

    // ===== Prefill EDIT
    useEffect(() => {
        let alive = true;
        const hydrateEdit = async () => {
            if (mode !== "edit" || !expenseId || didHydrateEdit.current) return;
            try {
                setInitialLoading(true);
                const [materials, labors, extras] = await Promise.all([
                    listCashMaterials(expenseId),
                    listCashLabors(expenseId),
                    listCashExtras(expenseId),
                ]);
                if (!alive) return;

                // reset kimia & extras
                setFertilizerItems([]);
                setInsectItems([]);
                setHerbItems([]);
                setFungiItems([]);
                setValue("extras.tax", "");
                setValue("extras.landRent", "");
                setValue("extras.transport", "");

                // reset labor
                ([
                    "nursery",
                    "land_prep",
                    "planting",
                    "fertilizing",
                    "irrigation",
                    "weeding",
                    "pest_ctrl",
                    "harvest",
                    "postharvest",
                ] as const).forEach((k) => {
                    const v = defaultLabor();
                    setValue(`labor.${k}.tipe`, v.tipe);
                    setValue(`labor.${k}.jumlahOrang`, v.jumlahOrang);
                    setValue(`labor.${k}.jumlahHari`, v.jumlahHari);
                    setValue(`labor.${k}.jamKerja`, v.jamKerja);
                    setValue(`labor.${k}.upahHarian`, v.upahHarian);
                    setValue(`labor.${k}.hargaBorongan`, v.hargaBorongan!);
                    setValue(`labor.${k}.upahBerlaku`, v.upahBerlaku!);
                });

                // Prefill seeds (seed/seedling)
                const formSeeds = (watch("seeds") || []) as SeedLine[];
                const seedLike = (materials || []).filter(
                    (m: any) => m?.category === "seed" || m?.category === "seedling"
                );
                const patched = formSeeds.map((s, i) => {
                    const hit = seedLike[i];
                    if (!hit) return s;
                    const k: "seed" | "seedling" =
                        hit.category === "seedling" ? "seedling" : "seed";
                    return {
                        ...s,
                        kind: k,
                        name: String(hit.item_name ?? hit.label ?? s.name ?? ""),
                        qty: String(hit.quantity ?? s.qty ?? ""),
                        price: String(hit.unit_price ?? s.price ?? ""),
                    };
                });
                setValue("seeds", patched, { shouldDirty: false });

                // Prefill kimia lain
                (materials || []).forEach((m: any) => {
                    const cat: Category | undefined = m?.category;
                    const unit: Unit | undefined = (m?.unit as Unit) ?? "gram";
                    const qty = String(m?.quantity ?? "");
                    const price = String(m?.unit_price ?? "");
                    const name = m?.item_name ?? m?.label ?? "";

                    if (cat === "fertilizer") {
                        setFertilizerItems((prev) => [
                            ...prev,
                            {
                                id: String(Date.now() + Math.random()),
                                category: "fertilizer",
                                name,
                                unit,
                                qty,
                                price,
                            },
                        ]);
                    } else if (cat === "insecticide") {
                        setInsectItems((prev) => [
                            ...prev,
                            {
                                id: String(Date.now() + Math.random()),
                                category: "insecticide",
                                name,
                                unit,
                                qty,
                                price,
                            },
                        ]);
                    } else if (cat === "herbicide") {
                        setHerbItems((prev) => [
                            ...prev,
                            {
                                id: String(Date.now() + Math.random()),
                                category: "herbicide",
                                name,
                                unit,
                                qty,
                                price,
                            },
                        ]);
                    } else if (cat === "fungicide") {
                        setFungiItems((prev) => [
                            ...prev,
                            {
                                id: String(Date.now() + Math.random()),
                                category: "fungicide",
                                name,
                                unit,
                                qty,
                                price,
                            },
                        ]);
                    }
                });

                // Prefill extras
                (extras || []).forEach((e: any) => {
                    const cat: Category = e?.metadata?.category;
                    if (cat === "tax") setValue("extras.tax", String(e.amount || ""));
                    if (cat === "land_rent") setValue("extras.landRent", String(e.amount || ""));
                    if (cat === "transport") setValue("extras.transport", String(e.amount || ""));
                });

                // Prefill labor
                const map: Record<string, keyof CashFormValues["labor"]> = {
                    labor_nursery: "nursery",
                    labor_land_prep: "land_prep",
                    labor_planting: "planting",
                    labor_fertilizing: "fertilizing",
                    labor_irrigation: "irrigation",
                    labor_weeding: "weeding",
                    labor_pest_ctrl: "pest_ctrl",
                    labor_harvest: "harvest",
                    labor_postharvest: "postharvest",
                };

                (labors || []).forEach((it: any) => {
                    const key = map[it?.metadata?.category as string];
                    if (!key) return;
                    const type = it?.labor_type || it?.metadata?.laborType || it?.metadata?.labor_type;
                    if (type === "contract") {
                        const kontrak = Number(it?.contract_price ?? 0);
                        const upahBerlaku = Number(it?.metadata?.prevailingWage ?? NaN);
                        setValue(`labor.${key}.tipe`, "borongan");
                        setValue(`labor.${key}.hargaBorongan`, kontrak ? String(kontrak) : "");
                        setValue(
                            `labor.${key}.upahBerlaku`,
                            Number.isFinite(upahBerlaku) ? String(upahBerlaku) : ""
                        );
                        setValue(`labor.${key}.jumlahOrang`, "");
                        setValue(`labor.${key}.jumlahHari`, "");
                        setValue(`labor.${key}.upahHarian`, "");
                    } else {
                        const people = Number(it?.people_count ?? it?.metadata?.peopleCount ?? 0) || 0;
                        const days = Number(it?.days ?? it?.metadata?.days ?? 0) || 0;
                        const wage = Number(it?.daily_wage ?? 0);
                        setValue(`labor.${key}.tipe`, "harian");
                        setValue(`labor.${key}.jumlahOrang`, String(people > 0 ? people : 0));
                        setValue(`labor.${key}.jumlahHari`, String(days > 0 ? days : 1));
                        setValue(`labor.${key}.upahHarian`, String(wage || ""));
                        setValue(`labor.${key}.jamKerja`, it?.metadata?.jamKerja != null ? String(it.metadata.jamKerja) : "");
                        setValue(`labor.${key}.hargaBorongan`, "");
                        setValue(`labor.${key}.upahBerlaku`, "");
                    }
                });

                didHydrateEdit.current = true;
            } catch (e) {
                if (!alive) return;
                console.warn("CashForm prefill error", e);
            } finally {
                if (alive) setInitialLoading(false);
            }
        };

        hydrateEdit();
        return () => {
            alive = false;
        };
    }, [
        mode,
        expenseId,
        listCashMaterials,
        listCashLabors,
        listCashExtras,
        setValue,
        watch,
    ]);

    // ===== Helpers
    const toNum = (s?: string) => {
        const v = parseFloat((s || "0").replace(",", "."));
        return Number.isFinite(v) ? v : 0;
    };

    const calcLaborSubtotal = useCallback((lf: LaborForm) => {
        if (lf.tipe === "borongan") {
            const kontrak = toNum(lf.hargaBorongan);
            return kontrak >= 0 ? kontrak : 0;
        }
        const orang = toNum(lf.jumlahOrang);
        const hari = toNum(lf.jumlahHari);
        const upah = toNum(lf.upahHarian);
        return orang > 0 && hari > 0 && upah >= 0 ? orang * hari * upah : 0;
    }, []);

    const sumChem = useCallback((rows: ChemItem[]) => {
        return rows.reduce((acc, r) => {
            const q = toNum(r.qty);
            const p = toNum(r.price);
            return acc + (q > 0 && p >= 0 ? q * p : 0);
        }, 0);
    }, []);

    const L = watch("labor");
    const extrasW = watch("extras");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const seedsW = (watch("seeds") || []) as SeedLine[];

    const chemOthersTotal =
        sumChem(fertilizerItems) + sumChem(insectItems) + sumChem(herbItems) + sumChem(fungiItems);

    const seedSubtotal = useMemo(
        () =>
            seedsW.reduce((acc, s) => {
                const q = toNum(s.qty);
                const p = toNum(s.price);
                return acc + (q > 0 && p >= 0 ? q * p : 0);
            }, 0),
        [seedsW]
    );

    const laborTotal = useMemo(() => {
        return (
            calcLaborSubtotal(L.nursery) +
            calcLaborSubtotal(L.land_prep) +
            calcLaborSubtotal(L.planting) +
            calcLaborSubtotal(L.fertilizing) +
            calcLaborSubtotal(L.irrigation) +
            calcLaborSubtotal(L.weeding) +
            calcLaborSubtotal(L.pest_ctrl) +
            calcLaborSubtotal(L.harvest) +
            calcLaborSubtotal(L.postharvest)
        );
    }, [L, calcLaborSubtotal]);

    const extrasSubtotal = useMemo(() => {
        return toNum(extrasW.landRent) + toNum(extrasW.transport) + toNum(extrasW.tax);
    }, [extrasW]);

    const total = useMemo(() => {
        return seedSubtotal + chemOthersTotal + laborTotal + extrasSubtotal;
    }, [seedSubtotal, chemOthersTotal, laborTotal, extrasSubtotal]);

    // ===== Validasi
    const seedsValid = useCallback(() => {
        if (!seedsW.length) return false;
        return seedsW.every(
            (r) =>
                (r.name?.trim()?.length ?? 0) > 0 &&
                toNum(r.qty) > 0 &&
                toNum(r.price) >= 0 &&
                (r.kind === "seed" || r.kind === "seedling")
        );
    }, [seedsW]);

    const allChemRowsValid = (rows: ChemItem[]) =>
        rows.length > 0 &&
        rows.every(
            (r) =>
                (r.name?.trim()?.length ?? 0) > 0 &&
                toNum(r.qty) > 0 &&
                toNum(r.price) >= 0
        );

    const chemRowsValidIfAny = (rows: ChemItem[]) =>
        rows.length === 0 ||
        rows.every(
            (r) =>
                (r.name?.trim()?.length ?? 0) > 0 &&
                toNum(r.qty) > 0 &&
                toNum(r.price) >= 0
        );

    const hasAnyLabor = useCallback(() => {
        const arr: LaborForm[] = [
            L.nursery,
            L.land_prep,
            L.planting,
            L.fertilizing,
            L.irrigation,
            L.weeding,
            L.pest_ctrl,
            L.harvest,
            L.postharvest,
        ];
        return arr.some((lf) => {
            if (lf.tipe === "borongan") return toNum(lf.hargaBorongan) > 0;
            const orang = toNum(lf.jumlahOrang);
            const hari = toNum(lf.jumlahHari);
            const upah = toNum(lf.upahHarian);
            return orang > 0 && hari > 0 && upah > 0;
        });
    }, [L]);

    // ===== Build payload
    const buildPayload = (fv: any) => {
        const out: any[] = [];

        // SEEDS (multi)
        (seedsW as SeedLine[]).forEach((s) => {
            const unit: Unit = s.kind === "seed" ? (SEED_UNIT as Unit) : (SEEDLING_UNIT as Unit);
            const q = toNum(s.qty);
            const p = toNum(s.price);
            if (q > 0 && p >= 0 && (s.name?.trim()?.length ?? 0) > 0) {
                out.push({
                    category: s.kind,
                    itemName: s.name,
                    unit,
                    quantity: q,
                    unitPrice: p,
                    _meta: { category: s.kind, unit, cropName: s.cropName },
                });
            }
        });

        // Kimia lain
        const chemToRows = (rows: ChemItem[]) =>
            rows.map((r) => ({
                category: r.category,
                itemName: r.name ?? null,
                unit: r.unit,
                quantity: toNum(r.qty),
                unitPrice: toNum(r.price),
                _meta: { category: r.category, unit: r.unit },
            }));

        out.push(
            ...chemToRows(fertilizerItems),
            ...chemToRows(insectItems),
            ...chemToRows(herbItems),
            ...chemToRows(fungiItems)
        );

        // Tenaga kerja
        const laborOne = (cat: Category, lf: LaborForm) => {
            if (lf.tipe === "borongan") {
                const kontrak = Math.max(0, toNum(lf.hargaBorongan));
                if (!(kontrak >= 0)) return null;
                return {
                    category: cat,
                    itemName: "borongan",
                    unit: "service" as Unit,
                    quantity: 1,
                    unitPrice: kontrak,
                    _meta: {
                        category: cat,
                        unit: "service",
                        laborType: "contract",
                        prevailingWage: lf.upahBerlaku ? Math.max(0, toNum(lf.upahBerlaku)) : undefined,
                        jamKerja: lf.jamKerja || undefined,
                    },
                };
            }
            const people = Math.max(0, toNum(lf.jumlahOrang));
            const days = Math.max(0, toNum(lf.jumlahHari));
            const qty = Math.max(0, people * days);
            const upah = Math.max(0, toNum(lf.upahHarian));
            if (qty <= 0) return null;
            return {
                category: cat,
                itemName: "harian",
                unit: "service" as Unit,
                quantity: qty,
                unitPrice: upah,
                _meta: {
                    category: cat,
                    unit: "service",
                    laborType: "daily",
                    peopleCount: people,
                    days,
                    jamKerja: lf.jamKerja || undefined,
                },
            };
        };

        const laborRows = [
            laborOne("labor_nursery", fv.labor.nursery),
            laborOne("labor_land_prep", fv.labor.land_prep),
            laborOne("labor_planting", fv.labor.planting),
            laborOne("labor_fertilizing", fv.labor.fertilizing),
            laborOne("labor_irrigation", fv.labor.irrigation),
            laborOne("labor_weeding", fv.labor.weeding),
            laborOne("labor_pest_ctrl", fv.labor.pest_ctrl),
            laborOne("labor_harvest", fv.labor.harvest),
            laborOne("labor_postharvest", fv.labor.postharvest),
        ].filter(Boolean) as any[];

        out.push(...laborRows);

        // EXTRAS
        const extras: any[] = [];
        const vTax = toNum(fv.extras.tax);
        if (vTax > 0)
            extras.push({
                category: "tax",
                unit: SERVICE_UNIT,
                quantity: 1,
                unitPrice: vTax,
                itemName: null,
                _meta: { category: "tax", unit: SERVICE_UNIT },
            });
        const vRent = toNum(fv.extras.landRent);
        if (vRent > 0)
            extras.push({
                category: "land_rent",
                unit: SERVICE_UNIT,
                quantity: 1,
                unitPrice: vRent,
                itemName: null,
                _meta: { category: "land_rent", unit: SERVICE_UNIT },
            });
        const vTrans = toNum(fv.extras.transport);
        if (vTrans > 0)
            extras.push({
                category: "transport",
                unit: SERVICE_UNIT,
                quantity: 1,
                unitPrice: vTrans,
                itemName: null,
                _meta: { category: "transport", unit: SERVICE_UNIT },
            });

        out.push(...extras);

        // filter final
        return out.filter(
            (x) =>
                Number.isFinite(x.quantity) &&
                x.quantity > 0 &&
                Number.isFinite(x.unitPrice) &&
                x.unitPrice >= 0
        );
    };

    // ===== Submit
    const [saving, setSaving] = useState(false);
    const onSubmit = async (fv: any) => {
        try {
            if (!seedsValid()) {
                Alert.alert(
                    "Validasi",
                    "Semua baris Bibit/Benih wajib diisi: pilih Benih/Bibit, isi nama, jumlah, dan harga satuan."
                );
                return;
            }
            if (!allChemRowsValid(fertilizerItems)) {
                Alert.alert("Validasi", "Pupuk minimal 1 item dan tiap baris harus lengkap.");
                return;
            }
            const pestOk =
                chemRowsValidIfAny(insectItems) &&
                chemRowsValidIfAny(herbItems) &&
                chemRowsValidIfAny(fungiItems);
            if (!pestOk) {
                Alert.alert("Validasi", "Jika isi pestisida, tiap baris harus lengkap.");
                return;
            }
            if (!hasAnyLabor()) {
                Alert.alert("Validasi", "Isi minimal satu item Tenaga Kerja (borongan/harian).");
                return;
            }

            const items = buildPayload(fv);
            if (!items.length) {
                Alert.alert("Validasi", "Isi minimal satu item yang valid.");
                return;
            }

            setSaving(true);
            if (mode === "edit" && expenseId) {
                await updateCashExpense(expenseId, { seasonId, items });
            } else {
                await createCashExpense({ seasonId, items });
            }
            router.replace("/(tabs)/expense");
        } catch (e: any) {
            console.warn("CASHFORM", e);
            Alert.alert("Gagal", e?.message ?? "Tidak dapat menyimpan pengeluaran.");
        } finally {
            setSaving(false);
        }
    };

    const showBlocking = initialLoading;

    // ===== Styles yang butuh C & S
    const cardStyle = {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: S.radius.lg,
        backgroundColor: C.surface,
        padding: S.spacing.md,
        gap: S.spacing.sm,
    } as const;

    const divider = (
        <View
            style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: C.border,
                marginTop: S.spacing.xs,
            }}
        />
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header */}
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.header,
                    { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg },
                ]}
            >
                <View style={styles.headerRow}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            {
                                borderColor: C.border,
                                backgroundColor: C.surface,
                                opacity: pressed ? 0.9 : 1,
                            },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <Text
                        style={[
                            styles.headerTitle,
                            { color: C.text, fontFamily: Fonts.rounded as any },
                        ]}
                    >
                        Pengeluaran | Tunai
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            {showBlocking ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: C.textMuted, marginBottom: S.spacing.xs }}>
                        {mode === "edit" ? "Memuat data..." : "Menyiapkan form..."}
                    </Text>
                </View>
            ) : (
                <KeyboardAwareScrollView
                    enableOnAndroid
                    extraScrollHeight={Platform.select({ ios: 20, android: 80 })}
                    contentContainerStyle={{
                        padding: S.spacing.lg,
                        paddingBottom: S.spacing.xl * 3,
                        gap: S.spacing.md,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ===== Bibit/Benih (Array) ===== */}
                    {(seedsW as SeedLine[]).map((s, idx) => {
                        const kind = s.kind ?? "seed";
                        const setKind = (v: "seed" | "seedling") => {
                            setValue(`seeds.${idx}.kind`, v as "seed" | "seedling", {
                                shouldDirty: true,
                            });
                        };
                        const seedRowSubtotal = Math.max(0, toNum(s.qty) * Math.max(0, toNum(s.price)));

                        return (
                            <View key={`${s.cropName}-${idx}`} style={cardStyle}>
                                <Text
                                    style={{
                                        color: C.textMuted,
                                        fontWeight: "800",
                                        fontFamily: Fonts.rounded as any,
                                    }}
                                >
                                    {`Bibit/Benih | ${s.cropName} *`}
                                </Text>

                                {/* Chips */}
                                <View style={{ flexDirection: "row", gap: S.spacing.sm, flexWrap: "wrap" }}>
                                    <Chip label="Benih" active={kind === "seed"} onPress={() => setKind("seed")} C={C} />
                                    <Chip label="Bibit" active={kind === "seedling"} onPress={() => setKind("seedling")} C={C} />
                                </View>

                                {/* Nama: Controller + TextInput */}
                                <Controller
                                    control={control}
                                    name={`seeds.${idx}.name`}
                                    rules={{
                                        required: "Wajib diisi",
                                        validate: (v) =>
                                            (String(v ?? "").trim().length > 0 && isNaN(Number(v))) ||
                                            "Isi nama (teks), bukan angka.",
                                    }}
                                    render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                                        <View>
                                            <Text style={[styles.label, { color: C.textMuted }]}>{`Nama ${kind === "seed" ? "Benih" : "Bibit"
                                                }`}</Text>
                                            <TextInput
                                                value={value ?? ""}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                placeholder={`Contoh: ${kind === "seed" ? "Benih Jagung Pioneer" : "Bibit Cabai Rawit"
                                                    }`}
                                                keyboardType="default"
                                                placeholderTextColor={C.textMuted}
                                                style={[
                                                    styles.inputBase,
                                                    {
                                                        borderColor: error ? C.danger : C.border,
                                                        backgroundColor: C.surface,
                                                        color: C.text,
                                                        borderRadius: S.radius.md,
                                                        paddingHorizontal: S.spacing.md,
                                                        paddingVertical: S.spacing.sm,
                                                    },
                                                ]}
                                            />
                                            {error && (
                                                <Text style={{ color: C.danger, marginTop: S.spacing.xs }}>{error.message}</Text>
                                            )}
                                        </View>
                                    )}
                                />

                                <RHFLineInput
                                    label="Jumlah"
                                    name={`seeds.${idx}.qty`}
                                    control={control}
                                    C={C}
                                    rules={{
                                        required: "Wajib diisi",
                                        validate: (v: any) =>
                                            parseFloat(String(v).replace(",", ".")) > 0 || "Harus > 0",
                                    }}
                                />
                                <RHFLineInput
                                    label="Harga per satuan"
                                    name={`seeds.${idx}.price`}
                                    control={control}
                                    C={C}
                                    rules={{
                                        required: "Wajib diisi",
                                        validate: (v: any) => {
                                            const x = parseFloat(String(v).replace(",", "."));
                                            return (!Number.isNaN(x) && x >= 0) || "Harus angka ≥ 0";
                                        },
                                    }}
                                />

                                {divider}

                                {/* Subtotal per baris seed */}
                                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                    Subtotal ≈{" "}
                                    <Text style={{ color: C.success, fontWeight: "900" }}>
                                        {currency(seedRowSubtotal || 0)}
                                    </Text>
                                </Text>
                            </View>
                        );
                    })}

                    {/* Subtotal semua Seeds */}
                    <View style={{ alignItems: "flex-start" }}>
                        <Text style={{ color: C.textMuted, fontSize: 12 }}>
                            Subtotal Semua ≈{" "}
                            <Text style={{ color: C.success, fontWeight: "900" }}>
                                {currency(seedSubtotal || 0)}
                            </Text>
                        </Text>
                    </View>

                    {/* ===== Pupuk ===== */}
                    <Text style={[styles.sectionTitle, { color: C.textMuted, fontFamily: Fonts.rounded as any }]}>
                        Pupuk
                    </Text>
                    <SectionButton
                        title="Tambah Pupuk"
                        icon="flask-outline"
                        open={openFertilizer}
                        onPress={() => setOpenFertilizer((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openFertilizer && (
                        <FertilizerPanel
                            schemeColors={{ C, S }}
                            onAdd={(p) =>
                                addChem(setFertilizerItems, { ...p, category: "fertilizer", unit: UNIT_FERTILIZER })
                            }
                            rows={fertilizerItems}
                            setRows={setFertilizerItems}
                        />
                    )}

                    {/* ===== Pestisida ===== */}
                    <Text style={[styles.sectionTitle, { color: C.textMuted, fontFamily: Fonts.rounded as any }]}>
                        Pestisida
                    </Text>
                    <SectionButton
                        title="Tambah Insektisida"
                        icon="bug-outline"
                        open={openInsect}
                        onPress={() => setOpenInsect((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openInsect && (
                        <ChemPanel
                            schemeColors={{ C, S }}
                            unitChoices={SATUAN_KIMIA}
                            placeholderName="Nama insektisida"
                            onAdd={(p) => addChem(setInsectItems, { ...p, category: "insecticide" })}
                            rows={insectItems}
                            setRows={setInsectItems}
                        />
                    )}
                    <SectionButton
                        title="Tambah Herbisida"
                        icon="leaf-outline"
                        open={openHerb}
                        onPress={() => setOpenHerb((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openHerb && (
                        <ChemPanel
                            schemeColors={{ C, S }}
                            unitChoices={SATUAN_KIMIA}
                            placeholderName="Nama herbisida"
                            onAdd={(p) => addChem(setHerbItems, { ...p, category: "herbicide" })}
                            rows={herbItems}
                            setRows={setHerbItems}
                        />
                    )}
                    <SectionButton
                        title="Tambah Fungisida"
                        icon="medkit-outline"
                        open={openFungi}
                        onPress={() => setOpenFungi((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openFungi && (
                        <ChemPanel
                            schemeColors={{ C, S }}
                            unitChoices={SATUAN_KIMIA}
                            placeholderName="Nama fungisida"
                            onAdd={(p) => addChem(setFungiItems, { ...p, category: "fungicide" })}
                            rows={fungiItems}
                            setRows={setFungiItems}
                        />
                    )}

                    {/* ===== Tenaga Kerja ===== */}
                    <Text style={[styles.sectionTitle, { color: C.textMuted, fontFamily: Fonts.rounded as any }]}>
                        Tenaga Kerja
                    </Text>

                    <LaborOne
                        title="Persemaian"
                        icon="flower-outline"
                        open={openNursery}
                        onPress={() => setOpenNursery((v) => !v)}
                        name="labor.nursery"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").nursery)}
                    />
                    <LaborOne
                        title="Pengolahan Lahan"
                        icon="construct-outline"
                        open={openLandPrep}
                        onPress={() => setOpenLandPrep((v) => !v)}
                        name="labor.land_prep"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").land_prep)}
                    />
                    <LaborOne
                        title="Penanaman"
                        icon="leaf-outline"
                        open={openPlanting}
                        onPress={() => setOpenPlanting((v) => !v)}
                        name="labor.planting"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").planting)}
                    />
                    <LaborOne
                        title="Pemupukan"
                        icon="flask-outline"
                        open={openFertLabor}
                        onPress={() => setOpenFertLabor((v) => !v)}
                        name="labor.fertilizing"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").fertilizing)}
                    />
                    <LaborOne
                        title="Penyiraman"
                        icon="water-outline"
                        open={openIrrigation}
                        onPress={() => setOpenIrrigation((v) => !v)}
                        name="labor.irrigation"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").irrigation)}
                    />
                    <LaborOne
                        title="Penyiangan"
                        icon="cut-outline"
                        open={openWeeding}
                        onPress={() => setOpenWeeding((v) => !v)}
                        name="labor.weeding"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").weeding)}
                    />
                    <LaborOne
                        title="Pengendalian Hama & Penyakit"
                        icon="shield-checkmark-outline"
                        open={openPestCtrl}
                        onPress={() => setOpenPestCtrl((v) => !v)}
                        name="labor.pest_ctrl"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").pest_ctrl)}
                    />
                    <LaborOne
                        title="Panen"
                        icon="basket-outline"
                        open={openHarvest}
                        onPress={() => setOpenHarvest((v) => !v)}
                        name="labor.harvest"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").harvest)}
                    />
                    <LaborOne
                        title="Pasca Panen"
                        icon="archive-outline"
                        open={openPostHarvest}
                        onPress={() => setOpenPostHarvest((v) => !v)}
                        name="labor.postharvest"
                        control={control}
                        C={C}
                        S={S}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").postharvest)}
                    />

                    {/* ===== Biaya Lain ===== */}
                    <Text style={[styles.sectionTitle, { color: C.textMuted, fontFamily: Fonts.rounded as any }]}>
                        Biaya Lain
                    </Text>
                    <SectionButton
                        title="Pajak & Sewa Lahan"
                        icon="pricetag-outline"
                        open={openExtras}
                        onPress={() => setOpenExtras((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openExtras && (
                        <View>
                            <RHFLineInput
                                label="Pajak per Tahun"
                                placeholder="Dalam Rupiah"
                                name="extras.tax"
                                control={control}
                                C={C}
                                rules={{
                                    required: "Wajib diisi",
                                    validate: (v: any) =>
                                        (!Number.isNaN(toNum(v)) && toNum(v) >= 0) || "Harus angka ≥ 0",
                                }}
                            />
                            <RHFLineInput
                                label="Sewa Lahan per Tahun"
                                name="extras.landRent"
                                control={control}
                                C={C}
                                rules={{
                                    required: "Wajib diisi",
                                    validate: (v: any) =>
                                        (!Number.isNaN(toNum(v)) && toNum(v) >= 0) || "Harus angka ≥ 0",
                                }}
                            />
                            <RHFLineInput
                                label="Transportasi"
                                name="extras.transport"
                                control={control}
                                C={C}
                                rules={{
                                    required: "Wajib diisi",
                                    validate: (v: any) =>
                                        (!Number.isNaN(toNum(v)) && toNum(v) >= 0) || "Harus angka ≥ 0",
                                }}
                            />

                            {divider}

                            <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                Subtotal Biaya Lain ≈{" "}
                                <Text style={{ color: C.success, fontWeight: "900" }}>
                                    {currency(extrasSubtotal || 0)}
                                </Text>
                            </Text>
                        </View>
                    )}

                    {/* ===== Footer ===== */}
                    <View style={{ marginTop: S.spacing.md }}>
                        <Text style={{ textAlign: "right", color: C.text, marginBottom: S.spacing.xs }}>
                            Total:{" "}
                            <Text style={{ color: C.success, fontWeight: "900", fontFamily: Fonts.rounded as any }}>
                                {currency(total)}
                            </Text>
                        </Text>
                        <Pressable
                            onPress={handleSubmit(onSubmit)}
                            disabled={saving}
                            style={({ pressed }) => [
                                styles.saveBtn,
                                {
                                    backgroundColor: C.tint,
                                    opacity: pressed ? 0.98 : 1,
                                    borderRadius: S.radius.xl,
                                    paddingVertical: S.spacing.md,
                                },
                            ]}
                        >
                            <Ionicons name="save-outline" size={18} color="#fff" />
                            <Text style={{ color: "#fff", fontWeight: "900", fontFamily: Fonts.rounded as any }}>
                                {saving ? "Menyimpan…" : "Simpan"}
                            </Text>
                        </Pressable>
                    </View>
                </KeyboardAwareScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    sectionTitle: { fontSize: 14, fontWeight: "800", marginTop: 8 },
    label: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
    inputBase: {
        borderWidth: 1,
    },
    saveBtn: {
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
});

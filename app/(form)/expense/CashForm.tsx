import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import ChemPanel from "@/components/ChemPanel";
import FertilizerPanel from "@/components/FertilizerPanel";
import LaborOne from "@/components/LaborOne";
import RHFLineInput from "@/components/RHFLineInput";
import SectionButton from "@/components/SectionButton";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useExpenseService } from "@/services/expenseService";
import { CashFormValues, Category, ChemItem, LaborForm, SATUAN_KIMIA, SEED_UNIT, SEEDLING_UNIT, SERVICE_UNIT, Unit, UNIT_FERTILIZER } from "@/types/expense";
import { currency } from "@/utils/currency";
type Mode = "create" | "edit";

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
        createCashExpense,
        updateCashExpense,
        listCashItems,
        loading: svcLoading,
    } = useExpenseService();

    // expand flags
    const [openSeed, setOpenSeed] = useState(false);
    const [openSeedling, setOpenSeedling] = useState(false);
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

    // data buckets
    const [seedItems, setSeedItems] = useState<ChemItem[]>([]);
    const [seedlingItems, setSeedlingItems] = useState<ChemItem[]>([]);
    const [fertilizerItems, setFertilizerItems] = useState<ChemItem[]>([]);
    const [insectItems, setInsectItems] = useState<ChemItem[]>([]);
    const [herbItems, setHerbItems] = useState<ChemItem[]>([]);
    const [fungiItems, setFungiItems] = useState<ChemItem[]>([]);

    const addChem = (
        setter: Dispatch<SetStateAction<ChemItem[]>>,
        item: Omit<ChemItem, "id">
    ) => setter((prev) => [...prev, { ...item, id: String(Date.now() + Math.random()) }]);

    /** ===== react-hook-form setup ===== */
    const defaultLabor = (): LaborForm => ({
        tipe: "harian",
        jumlahOrang: "",
        jumlahHari: "",
        jamKerja: "",
        upahHarian: "",
    });

    const { control, handleSubmit, watch, setValue } = useForm<CashFormValues>({
        defaultValues: {
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
    const [initialLoading, setInitialLoading] = useState<boolean>(mode === "edit");

    useEffect(() => {
        let alive = true;

        const hydrateEdit = async () => {
            if (mode !== "edit" || !expenseId) return;
            if (didHydrateEdit.current) return;

            try {
                setInitialLoading(true);
                const rows = await listCashItems(expenseId);
                if (!alive) return;

                // reset buckets
                setSeedItems([]);
                setSeedlingItems([]);
                setFertilizerItems([]);
                setInsectItems([]);
                setHerbItems([]);
                setFungiItems([]);

                // reset extras
                setValue("extras.tax", "");
                setValue("extras.landRent", "");
                setValue("extras.transport", "");

                // reset labor
                const clearLaborKey = (key: keyof CashFormValues["labor"]) => {
                    const v: LaborForm = defaultLabor();
                    setValue(`labor.${key}.tipe` as const, v.tipe);
                    setValue(`labor.${key}.jumlahOrang` as const, v.jumlahOrang);
                    setValue(`labor.${key}.jumlahHari` as const, v.jumlahHari);
                    setValue(`labor.${key}.jamKerja` as const, v.jamKerja);
                    setValue(`labor.${key}.upahHarian` as const, v.upahHarian);
                };
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
                ] as (keyof CashFormValues["labor"])[]).forEach(clearLaborKey);

                const laborCatToKey: Record<string, keyof CashFormValues["labor"]> = {
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

                rows.forEach((it: any) => {
                    const cat: Category | undefined = it?.metadata?.category;
                    const unit: Unit | undefined = it?.metadata?.unit;

                    // bahan/kimia
                    const pushChem = (setter: Dispatch<SetStateAction<ChemItem[]>>) => {
                        const id = String(Date.now() + Math.random());
                        const qty = String(it.quantity ?? "");
                        const price = String(it.unit_price ?? "");
                        const name = it.label ?? it.item_name ?? "";
                        setter((prev) => [
                            ...prev,
                            {
                                id,
                                category: cat!,
                                name,
                                unit: (unit as Unit) ?? "gram",
                                qty,
                                price,
                            },
                        ]);
                    };

                    if (cat === "seed") return pushChem(setSeedItems);
                    if (cat === "seedling") return pushChem(setSeedlingItems);
                    if (cat === "fertilizer") return pushChem(setFertilizerItems);
                    if (cat === "insecticide") return pushChem(setInsectItems);
                    if (cat === "herbicide") return pushChem(setHerbItems);
                    if (cat === "fungicide") return pushChem(setFungiItems);

                    // extras
                    if (cat === "tax") {
                        setValue("extras.tax", String(it.unit_price ?? it.subtotal ?? it.amount_estimate ?? ""));
                        return;
                    }
                    if (cat === "land_rent") {
                        setValue("extras.landRent", String(it.unit_price ?? it.subtotal ?? it.amount_estimate ?? ""));
                        return;
                    }
                    if (cat === "transport") {
                        setValue("extras.transport", String(it.unit_price ?? it.subtotal ?? it.amount_estimate ?? ""));
                        return;
                    }

                    // labor
                    if (cat && cat.startsWith("labor_")) {
                        const key = laborCatToKey[cat];
                        if (!key) return;

                        const laborType = it?.metadata?.laborType as "contract" | "daily" | undefined;
                        const tipe: LaborForm["tipe"] = laborType === "contract" ? "borongan" : "harian";

                        const people = Number(it?.metadata?.peopleCount ?? 0);
                        const days = Number(it?.metadata?.days ?? 0);
                        const wage = Number(it?.unit_price ?? 0);

                        // fallback metadata lama
                        const qty = Number(it?.quantity ?? 0);
                        const jumlahOrang = people > 0 ? people : qty > 0 ? qty : 0;
                        const jumlahHari = days > 0 ? days : 1;

                        setValue(`labor.${key}.tipe` as const, tipe);
                        setValue(`labor.${key}.jumlahOrang` as const, String(jumlahOrang || ""));
                        setValue(`labor.${key}.jumlahHari` as const, String(jumlahHari || ""));
                        setValue(`labor.${key}.upahHarian` as const, String(wage || ""));
                        if (it?.metadata?.jamKerja != null) {
                            setValue(`labor.${key}.jamKerja` as const, String(it.metadata.jamKerja));
                        }
                    }
                });

                didHydrateEdit.current = true; // lock
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
    }, [mode, expenseId, listCashItems, setValue]);

    // subtotal helpers
    const toNum = (s?: string) => {
        const v = parseFloat((s || "0").replace(",", "."));
        return Number.isFinite(v) ? v : 0;
    };

    const calcLaborSubtotal = useCallback((lf: LaborForm) => {
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

    // watch labor + extras for total
    const laborW = watch("labor");
    const extrasW = watch("extras");

    const total = useMemo(() => {
        const extras = toNum(extrasW.tax) + toNum(extrasW.landRent) + toNum(extrasW.transport);

        const chem =
            sumChem(seedItems) +
            sumChem(seedlingItems) +
            sumChem(fertilizerItems) +
            sumChem(insectItems) +
            sumChem(herbItems) +
            sumChem(fungiItems);

        const laborTotal =
            calcLaborSubtotal(laborW.nursery) +
            calcLaborSubtotal(laborW.land_prep) +
            calcLaborSubtotal(laborW.planting) +
            calcLaborSubtotal(laborW.fertilizing) +
            calcLaborSubtotal(laborW.irrigation) +
            calcLaborSubtotal(laborW.weeding) +
            calcLaborSubtotal(laborW.pest_ctrl) +
            calcLaborSubtotal(laborW.harvest) +
            calcLaborSubtotal(laborW.postharvest);

        return chem + laborTotal + extras;
    }, [
        calcLaborSubtotal,
        sumChem,
        seedItems,
        seedlingItems,
        fertilizerItems,
        insectItems,
        herbItems,
        fungiItems,
        laborW,
        extrasW,
    ]);

    // payload mapping → service.create/updateCashExpense (camelCase)
    const buildPayload = (fv: CashFormValues) => {
        const chemToRows = (rows: ChemItem[]) =>
            rows.map((r) => ({
                category: r.category,
                itemName: r.name ?? null,
                unit: r.unit,
                quantity: toNum(r.qty),
                unitPrice: toNum(r.price),
                _meta: { category: r.category, unit: r.unit },
            }));

        const laborOne = (cat: Category, lf: LaborForm) => {
            const people = Math.max(0, toNum(lf.jumlahOrang));
            const days = Math.max(0, toNum(lf.jumlahHari));
            const qty = Math.max(0, people * days);
            const upah = Math.max(0, toNum(lf.upahHarian));
            if (qty <= 0) return null;
            const laborType = lf.tipe === "borongan" ? "contract" : "daily";
            return {
                category: cat,
                itemName: lf.tipe,
                unit: "service" as Unit,
                quantity: qty,
                unitPrice: upah,
                _meta: {
                    category: cat,
                    unit: "service",
                    laborType,
                    peopleCount: people,
                    days,
                    jamKerja: lf.jamKerja || undefined,
                },
            };
        };

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

        return [
            ...chemToRows(seedItems),
            ...chemToRows(seedlingItems),
            ...chemToRows(fertilizerItems),
            ...chemToRows(insectItems),
            ...chemToRows(herbItems),
            ...chemToRows(fungiItems),
            ...laborRows,
            ...extras,
        ].filter(
            (x) =>
                Number.isFinite(x.quantity) &&
                x.quantity > 0 &&
                Number.isFinite(x.unitPrice) &&
                x.unitPrice >= 0
        );
    };

    const [saving, setSaving] = useState(false);
    const onSubmit = async (fv: CashFormValues) => {
        try {
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

    // blocking state mengikuti pola income/form.tsx
    const showBlocking = initialLoading || svcLoading === true;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
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
                    <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                        Pengeluaran | Tunai
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            {showBlocking ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: C.textMuted, marginBottom: 8 }}>
                        {mode === "edit" ? "Memuat data..." : "Menyiapkan form..."}
                    </Text>
                </View>
            ) : (
                <KeyboardAwareScrollView
                    enableOnAndroid
                    extraScrollHeight={Platform.select({ ios: 20, android: 80 })}
                    contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: 140, gap: 12 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ===== Bibit ===== */}
                    <Text style={{ color: C.textMuted, fontWeight: "800", marginTop: 4 }}>Bibit</Text>
                    <SectionButton
                        title="Tambah Benih (gram)"
                        icon="leaf-outline"
                        open={openSeed}
                        onPress={() => setOpenSeed((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openSeed && (
                        <ChemPanel
                            schemeColors={{ C, S }}
                            unitChoices={[SEED_UNIT]}
                            placeholderName="Nama benih"
                            onAdd={(p) => addChem(setSeedItems, { ...p, category: "seed", unit: SEED_UNIT })}
                            rows={seedItems}
                            setRows={setSeedItems}
                        />
                    )}

                    <SectionButton
                        title="Tambah Bibit (ikat)"
                        icon="flower-outline"
                        open={openSeedling}
                        onPress={() => setOpenSeedling((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openSeedling && (
                        <ChemPanel
                            schemeColors={{ C, S }}
                            unitChoices={[SEEDLING_UNIT]}
                            placeholderName="Nama bibit"
                            onAdd={(p) => addChem(setSeedlingItems, { ...p, category: "seedling", unit: SEEDLING_UNIT })}
                            rows={seedlingItems}
                            setRows={setSeedlingItems}
                        />
                    )}

                    {/* ===== Pupuk ===== */}
                    <Text style={{ color: C.textMuted, fontWeight: "800", marginTop: 8 }}>Pupuk</Text>
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
                    <Text style={{ color: C.textMuted, fontWeight: "800", marginTop: 8 }}>Pestisida</Text>
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
                    <Text style={{ color: C.textMuted, fontWeight: "800", marginTop: 8 }}>Tenaga Kerja</Text>

                    <LaborOne
                        title="Pesemaian"
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
                        title="Penyiayangan"
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
                    <Text style={{ color: C.textMuted, fontWeight: "800", marginTop: 8 }}>Biaya Lain</Text>
                    <SectionButton
                        title="Pajak & Sewa Lahan"
                        icon="pricetag-outline"
                        open={openExtras}
                        onPress={() => setOpenExtras((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openExtras && (
                        <View style={{ marginTop: 8, gap: 10 }}>
                            <Text style={{ color: C.textMuted, fontWeight: "800" }}>Biaya Lain</Text>
                            <RHFLineInput
                                label="Pajak"
                                name="extras.tax"
                                control={control}
                                C={C}
                                rules={{
                                    validate: (v: CashFormValues["extras"]["tax"]) =>
                                        v === "" || toNum(v) >= 0 || "Harus angka ≥ 0",
                                }}
                            />
                            <RHFLineInput
                                label="Sewa Lahan"
                                name="extras.landRent"
                                control={control}
                                C={C}
                                rules={{
                                    validate: (v: CashFormValues["extras"]["landRent"]) =>
                                        v === "" || toNum(v) >= 0 || "Harus angka ≥ 0",
                                }}
                            />
                            <RHFLineInput
                                label="Transportasi"
                                name="extras.transport"
                                control={control}
                                C={C}
                                rules={{
                                    validate: (v: CashFormValues["extras"]["transport"]) =>
                                        v === "" || toNum(v) >= 0 || "Harus angka ≥ 0",
                                }}
                            />
                        </View>
                    )}

                    {/* ===== Footer ===== */}
                    <View style={{ marginTop: 12 }}>
                        <Text style={{ textAlign: "right", color: C.text, marginBottom: 8 }}>
                            Total: <Text style={{ color: C.success, fontWeight: "900" }}>{currency(total)}</Text>
                        </Text>
                        <Pressable
                            onPress={handleSubmit(onSubmit)}
                            disabled={saving || svcLoading}
                            style={({ pressed }) => [
                                styles.saveBtn,
                                { backgroundColor: C.tint, opacity: pressed ? 0.98 : 1, borderRadius: S.radius.xl },
                            ]}
                        >
                            <Ionicons name="save-outline" size={18} color="#fff" />
                            <Text style={{ color: "#fff", fontWeight: "900" }}>
                                {saving || svcLoading ? "Menyimpan…" : "Simpan"}
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
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    saveBtn: { paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
});

import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import LaborOne from "@/components/LaborOne";
import RHFLineInput from "@/components/RHFLineInput";
import SectionButton from "@/components/SectionButton";
import ToolPanel from "@/components/ToolPanel";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useExpenseService } from "@/services/expenseService";
import {
    LaborForm,
    NonCashFormValues,
    NonCashLaborInput,
    NonCashToolInput,
    ToolForm,
} from "@/types/expense";
import { currency } from "@/utils/currency";

export default function NonCashForm({
    seasonId,
    mode = "create",
    expenseId,
}: {
    seasonId: string;
    mode?: "create" | "edit";
    expenseId?: string;
}) {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const {
        createNonCashExpense,
        updateNonCashExpense,
        listNonCashLabor,
        listNonCashTools,
        listNonCashExtras,
    } = useExpenseService();

    const [openNursery, setOpenNursery] = useState(false);
    const [openLandPrep, setOpenLandPrep] = useState(false);
    const [openPlanting, setOpenPlanting] = useState(false);
    const [openFertilizing, setOpenFertilizing] = useState(false);
    const [openIrrigation, setOpenIrrigation] = useState(false);
    const [openWeeding, setOpenWeeding] = useState(false);
    const [openPestCtrl, setOpenPestCtrl] = useState(false);
    const [openHarvest, setOpenHarvest] = useState(false);
    const [openPostHarvest, setOpenPostHarvest] = useState(false);
    const [openTools, setOpenTools] = useState(false);
    const [openExtras, setOpenExtras] = useState(true);
    const [tools, setTools] = useState<ToolForm[]>([]);

    const defaultLabor = (): LaborForm => ({
        tipe: "harian",
        jumlahOrang: "",
        jumlahHari: "",
        jamKerja: "",
        upahHarian: "",
        hargaBorongan: "",
        upahBerlaku: "",
    });

    const { control, handleSubmit, watch, setValue, getValues } =
        useForm<NonCashFormValues>({
            defaultValues: {
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
                tools: [],
                extras: { tax: "", landRent: "" },
            },
            mode: "onChange",
        });

    const didHydrateEdit = useRef(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(
        mode === "edit"
    );

    /** ===== Helpers ===== */
    const toNum = (x?: unknown) => {
        if (x === null || x === undefined) return 0;
        if (typeof x === "number") return Number.isFinite(x) ? x : 0;
        if (typeof x === "string") {
            const v = parseFloat(x.replace(",", "."));
            return Number.isFinite(v) ? v : 0;
        }
        return 0;
    };

    const toStr = (v: any) => (v === null || v === undefined ? "" : String(v));

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

    /** ===== Hydrate (edit) ===== */
    useEffect(() => {
        let alive = true;
        const hydrate = async () => {
            if (mode !== "edit" || !expenseId) return;
            if (didHydrateEdit.current) return;
            try {
                setInitialLoading(true);
                const [labors, toolsRows, extras] = await Promise.all([
                    listNonCashLabor(expenseId),
                    listNonCashTools(expenseId),
                    listNonCashExtras(expenseId),
                ]);
                if (!alive) return;

                // tools
                setTools(
                    (toolsRows || []).map((t: any) => ({
                        id: String(t.id),
                        nama: t.label ?? t.tool_name ?? "",
                        jumlah: toStr(t.quantity),
                        hargaBeli: toStr(t.purchase_price),
                        umurThn: toStr(t.useful_life_years),
                        nilaiSisa: toStr(t.salvage_value),
                    }))
                );

                // extras
                setValue("extras.tax", "");
                setValue("extras.landRent", "");
                (extras || []).forEach((e: any) => {
                    const kind =
                        e?.extra_kind || e?.metadata?.type || e?.metadata?.extra_kind;
                    const amount = toNum(e?.unit_price ?? e?.amount_estimate ?? e?.amount);
                    if (kind === "tax") setValue("extras.tax", toStr(amount));
                    if (kind === "land_rent") setValue("extras.landRent", toStr(amount));
                });

                const labelToKey: Record<string, keyof NonCashFormValues["labor"]> = {
                    pesemaian: "nursery",
                    "pengolahan lahan": "land_prep",
                    penanaman: "planting",
                    pemupukan: "fertilizing",
                    penyiraman: "irrigation",
                    penyiangan: "weeding",
                    "pengendalian hama & penyakit": "pest_ctrl",
                    "pengendalian hama dan penyakit": "pest_ctrl",
                    panen: "harvest",
                    "pasca panen": "postharvest",
                };

                const getStageKeyFromRow = (
                    r: any
                ): keyof NonCashFormValues["labor"] | undefined => {
                    const lbl = String(r?.label ?? "").trim().toLowerCase();
                    if (labelToKey[lbl]) return labelToKey[lbl];
                    const contains = (s: string) => lbl.includes(s);
                    if (contains("semai")) return "nursery";
                    if (contains("olah") && contains("lahan")) return "land_prep";
                    if (contains("tanam")) return "planting";
                    if (contains("pupuk")) return "fertilizing";
                    if (contains("siram")) return "irrigation";
                    if (contains("siang")) return "weeding";
                    if (contains("hama") || contains("penyakit")) return "pest_ctrl";
                    if (contains("panen") && !contains("pasca")) return "harvest";
                    if (contains("pasca")) return "postharvest";
                    return undefined;
                };

                // labor
                const setLabor = (
                    key: keyof NonCashFormValues["labor"],
                    lf: Partial<LaborForm>
                ) => {
                    const now = getValues(`labor.${key}`);
                    setValue(`labor.${key}.tipe` as const, lf.tipe ?? now.tipe, {
                        shouldDirty: false,
                    });
                    setValue(
                        `labor.${key}.jumlahOrang` as const,
                        lf.jumlahOrang ?? now.jumlahOrang,
                        { shouldDirty: false }
                    );
                    setValue(
                        `labor.${key}.jumlahHari` as const,
                        lf.jumlahHari ?? now.jumlahHari,
                        { shouldDirty: false }
                    );
                    setValue(
                        `labor.${key}.jamKerja` as const,
                        lf.jamKerja ?? now.jamKerja,
                        { shouldDirty: false }
                    );
                    setValue(
                        `labor.${key}.upahHarian` as const,
                        lf.upahHarian ?? now.upahHarian,
                        { shouldDirty: false }
                    );
                    setValue(
                        `labor.${key}.hargaBorongan` as const,
                        lf.hargaBorongan ?? now.hargaBorongan,
                        { shouldDirty: false }
                    );
                    setValue(
                        `labor.${key}.upahBerlaku` as const,
                        lf.upahBerlaku ?? now.upahBerlaku,
                        { shouldDirty: false }
                    );
                };

                (labors || []).forEach((r: any) => {
                    const key = getStageKeyFromRow(r);
                    if (!key) return;

                    const laborType =
                        r?.metadata?.labor_type ?? r?.labor_type ?? r?.metadata?.laborType;
                    const isContract = String(laborType) === "contract";

                    if (isContract) {
                        const contractPrice =
                            r?.metadata?.contract_price ?? r?.contract_price ?? null;
                        const prevailingWage =
                            r?.metadata?.prevailing_wage ?? r?.prevailing_wage ?? null;

                        setLabor(key, {
                            tipe: "borongan",
                            hargaBorongan: toStr(contractPrice),
                            upahBerlaku: toStr(prevailingWage),
                            jumlahOrang: "",
                            jumlahHari: "",
                            upahHarian: "",
                            jamKerja: "",
                        });
                    } else {
                        // harian
                        const orang =
                            r?.people_count ??
                            r?.metadata?.people_count ??
                            r?.metadata?.peopleCount ??
                            0;
                        const hari =
                            r?.days ?? r?.metadata?.days ?? r?.metadata?.jumlahHari ?? 0;
                        const upah =
                            r?.daily_wage ??
                            r?.metadata?.daily_wage ??
                            r?.metadata?.dailyWage ??
                            0;
                        const jam =
                            r?.metadata?.hours_per_day ?? r?.hours_per_day ?? null;

                        setLabor(key, {
                            tipe: "harian",
                            jumlahOrang: toStr(orang),
                            jumlahHari: toStr(hari),
                            upahHarian: toStr(upah),
                            jamKerja: jam != null ? toStr(jam) : "",
                            hargaBorongan: "",
                            upahBerlaku: "",
                        });
                    }
                });

                didHydrateEdit.current = true;
            } catch (e) {
                if (!alive) return;
                console.warn("NonCash hydrate error", e);
            } finally {
                if (alive) setInitialLoading(false);
            }
        };
        hydrate();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, expenseId, listNonCashLabor, listNonCashTools, listNonCashExtras]);

    // watches
    const laborW = watch("labor");
    const extrasW = watch("extras");

    const total = useMemo(() => {
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

        const toolsTotal = (tools || []).reduce((sum, t) => {
            const qty = toNum(t.jumlah);
            const price = toNum(t.hargaBeli);
            return sum + (qty > 0 && price >= 0 ? qty * price : 0);
        }, 0);

        const extras = toNum(extrasW.landRent) + toNum(extrasW.tax);
        const totalNonCash = toolsTotal + laborTotal + extras;
        return totalNonCash;
    }, [calcLaborSubtotal, laborW, tools, extrasW]);

    /** ===== Build payload (sesuai service baru) ===== */
    const buildPayload = (fv: NonCashFormValues) => {
        const mapLabor = (
            key: keyof NonCashFormValues["labor"],
            stageLabel: string
        ): NonCashLaborInput | null => {
            const r = fv.labor[key];

            if (r.tipe === "borongan") {
                const contractPrice = Math.max(0, toNum(r.hargaBorongan));
                const prevailingWage = Math.max(0, toNum(r.upahBerlaku));
                return {
                    laborType: "contract",
                    contractPrice,
                    prevailingWage,
                    stageLabel,
                };
            }

            // harian
            const people = Math.max(0, toNum(r.jumlahOrang));
            const days = Math.max(0, toNum(r.jumlahHari));
            const wage = Math.max(0, toNum(r.upahHarian));
            if (!(people > 0 && days > 0 && wage >= 0)) return null;

            return {
                laborType: "daily",
                peopleCount: people,
                days,
                dailyWage: wage,
                jamKerja: r.jamKerja !== "" ? Math.max(0, toNum(r.jamKerja)) : null,
                stageLabel,
            };
        };

        const labors = [
            mapLabor("nursery", "Pesemaian"),
            mapLabor("land_prep", "Pengolahan Lahan"),
            mapLabor("planting", "Penanaman"),
            mapLabor("fertilizing", "Pemupukan"),
            mapLabor("irrigation", "Penyiraman"),
            mapLabor("weeding", "Penyiangan"),
            mapLabor("pest_ctrl", "Pengendalian Hama & Penyakit"),
            mapLabor("harvest", "Panen"),
            mapLabor("postharvest", "Pasca Panen"),
        ].filter((v): v is NonCashLaborInput => v !== null);

        // tools
        const toolItems = (tools || [])
            .map((t): NonCashToolInput | null => {
                const quantity = Math.max(0, toNum(t.jumlah));
                const purchasePrice = Math.max(0, toNum(t.hargaBeli));
                if (!(quantity > 0 && purchasePrice >= 0)) return null;

                const uly = t.umurThn ? Math.max(0, toNum(t.umurThn)) : undefined;
                const sv = t.nilaiSisa ? Math.max(0, toNum(t.nilaiSisa)) : undefined;

                return {
                    toolName: t.nama?.trim() || "Alat",
                    quantity,
                    purchasePrice,
                    ...(uly !== undefined ? { usefulLifeYears: uly } : {}),
                    ...(sv !== undefined ? { salvageValue: sv } : {}),
                };
            })
            .filter((v): v is NonCashToolInput => v !== null);

        // extras
        const extras: { type: "tax" | "land_rent"; amount: number }[] = [];
        const vTax = toNum(fv.extras.tax);
        if (vTax > 0) extras.push({ type: "tax", amount: vTax });
        const vRent = toNum(fv.extras.landRent);
        if (vRent > 0) extras.push({ type: "land_rent", amount: vRent });

        return { labors, tools: toolItems, extras };
    };

    /** ===== Submit ===== */
    const [saving, setSaving] = useState(false);
    const onSubmit = async (fv: NonCashFormValues) => {
        try {
            const { labors, tools: toolItems, extras } = buildPayload(fv);

            if (labors.length === 0 && toolItems.length === 0 && extras.length === 0) {
                Alert.alert("Validasi", "Isi minimal satu data yang valid.");
                return;
            }

            setSaving(true);
            if (mode === "edit" && expenseId) {
                await updateNonCashExpense({
                    expenseId,
                    seasonId,
                    labors,
                    tools: toolItems,
                    extras,
                });
            } else {
                await createNonCashExpense({ seasonId, labors, tools: toolItems, extras });
            }
            router.replace("/(tabs)/expense");
        } catch (e: any) {
            console.warn("NONCASHFORM", e);
            Alert.alert("Gagal", e?.message ?? "Tidak dapat menyimpan pengeluaran non tunai.");
        } finally {
            setSaving(false);
        }
    };

    const showBlocking = initialLoading;

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
                        Pengeluaran | Non Tunai
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
                    {/* ===== Tenaga Kerja ===== */}
                    <Text style={{ color: C.textMuted, fontWeight: "800", marginTop: 4 }}>Tenaga Kerja</Text>

                    <LaborOne
                        title="Pesemaian"
                        icon="flower-outline"
                        open={openNursery}
                        onPress={() => setOpenNursery((v) => !v)}
                        name="labor.nursery"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").nursery)}
                        C={C}
                        S={S}
                    />
                    <LaborOne
                        title="Pengolahan Lahan"
                        icon="construct-outline"
                        open={openLandPrep}
                        onPress={() => setOpenLandPrep((v) => !v)}
                        name="labor.land_prep"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").land_prep)}
                        C={C}
                        S={S}
                    />
                    <LaborOne
                        title="Penanaman"
                        icon="leaf-outline"
                        open={openPlanting}
                        onPress={() => setOpenPlanting((v) => !v)}
                        name="labor.planting"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").planting)}
                        C={C}
                        S={S}
                    />
                    <LaborOne
                        title="Pemupukan"
                        icon="flask-outline"
                        open={openFertilizing}
                        onPress={() => setOpenFertilizing((v) => !v)}
                        name="labor.fertilizing"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").fertilizing)}
                        C={C}
                        S={S}
                    />
                    <LaborOne
                        title="Penyiraman"
                        icon="water-outline"
                        open={openIrrigation}
                        onPress={() => setOpenIrrigation((v) => !v)}
                        name="labor.irrigation"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").irrigation)}
                        C={C}
                        S={S}
                    />
                    <LaborOne
                        title="Penyiangan"
                        icon="cut-outline"
                        open={openWeeding}
                        onPress={() => setOpenWeeding((v) => !v)}
                        name="labor.weeding"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").weeding)}
                        C={C}
                        S={S}
                    />
                    <LaborOne
                        title="Pengendalian Hama & Penyakit"
                        icon="shield-checkmark-outline"
                        open={openPestCtrl}
                        onPress={() => setOpenPestCtrl((v) => !v)}
                        name="labor.pest_ctrl"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").pest_ctrl)}
                        C={C}
                        S={S}
                    />
                    <LaborOne
                        title="Panen"
                        icon="basket-outline"
                        open={openHarvest}
                        onPress={() => setOpenHarvest((v) => !v)}
                        name="labor.harvest"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").harvest)}
                        C={C}
                        S={S}
                    />
                    <LaborOne
                        title="Pasca Panen"
                        icon="archive-outline"
                        open={openPostHarvest}
                        onPress={() => setOpenPostHarvest((v) => !v)}
                        name="labor.postharvest"
                        control={control}
                        setValue={setValue}
                        subtotal={calcLaborSubtotal(watch("labor").postharvest)}
                        C={C}
                        S={S}
                    />

                    {/* ===== Alat ===== */}
                    <Text style={{ color: C.textMuted, fontWeight: "800", marginTop: 8 }}>Alat</Text>
                    <SectionButton
                        title="Tambah Alat"
                        icon="hammer-outline"
                        open={openTools}
                        onPress={() => setOpenTools((v) => !v)}
                        C={C}
                        S={S}
                    />
                    {openTools && <ToolPanel C={C} tools={tools} setTools={setTools} />}

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
                            <RHFLineInput
                                label="Pajak"
                                placeholder="Dalam Rupiah"
                                name="extras.tax"
                                control={control}
                                C={C}
                                rules={{
                                    required: "Wajib diisi",
                                    validate: (v: NonCashFormValues["extras"]["tax"]) =>
                                        (!Number.isNaN(toNum(v)) && toNum(v) >= 0) || "Harus angka ≥ 0",
                                }}
                            />
                            <RHFLineInput
                                label="Sewa Lahan"
                                name="extras.landRent"
                                control={control}
                                C={C}
                                rules={{
                                    required: "Wajib diisi",
                                    validate: (v: NonCashFormValues["extras"]["landRent"]) =>
                                        (!Number.isNaN(toNum(v)) && toNum(v) >= 0) || "Harus angka ≥ 0",
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
                            disabled={saving}
                            style={({ pressed }) => [
                                styles.saveBtn,
                                { backgroundColor: C.tint, opacity: pressed ? 0.98 : 1, borderRadius: S.radius.xl },
                            ]}
                        >
                            <Ionicons name="save-outline" size={18} color="#fff" />
                            <Text style={{ color: "#fff", fontWeight: "900" }}>
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
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    saveBtn: {
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
});

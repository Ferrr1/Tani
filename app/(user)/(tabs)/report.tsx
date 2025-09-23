import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useReportData } from "@/services/reportService";
import { currency } from "@/utils/currency";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
    Keyboard,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Theme = typeof Colors["light"];

type Row =
    | { label: string; qty?: number; unit?: string | null; price?: number; amount?: never }
    | { label: string; amount: number; qty?: never; unit?: never; price?: never };

const rowValue = (r: Row) => {
    if (typeof (r as any).amount === "number") return (r as any).amount;
    const rr = r as Exclude<Row, { amount: number }>;
    if (rr.qty != null && rr.price != null) return rr.qty * rr.price;
    if (rr.price != null) return rr.price;
    return 0;
};

export default function ReportScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme] as Theme;
    const S = Tokens;

    const {
        loading,
        seasons,
        seasonId,
        setSeasonId,
        year,
        setYear,
        yearOptions,
        buildDataset,
    } = useReportData();

    const currentSeason = useMemo(
        () => seasons.find((s) => s.id === seasonId) || null,
        [seasons, seasonId]
    );

    const [openSeason, setOpenSeason] = useState(false);
    const [openYear, setOpenYear] = useState(false);

    const [currentArea, setCurrentArea] = useState("1");
    const [targetArea, setTargetArea] = useState("1");

    const landFactor = useMemo(() => {
        const cur = parseFloat((currentArea || "").replace(",", "."));
        const tar = parseFloat((targetArea || "").replace(",", "."));
        const c = Number.isFinite(cur) && cur > 0 ? cur : 1;
        const t = Number.isFinite(tar) && tar > 0 ? tar : 1;
        return t / c;
    }, [currentArea, targetArea]);

    const [standardDailyWage, setStandardDailyWage] = useState("0");

    const [dataset, setDataset] = useState<Awaited<ReturnType<typeof buildDataset>> | null>(null);

    React.useEffect(() => {
        let alive = true;
        (async () => {
            const d = await buildDataset({
                landFactor,
                standardDailyWage: parseFloat((standardDailyWage || "0").replace(",", ".")) || 0,
            });
            if (alive) setDataset(d);
        })();
        return () => { alive = false; };
    }, [buildDataset, landFactor, standardDailyWage]);

    const productionRows: Row[] = useMemo(() => {
        if (!dataset) return [];
        return dataset.production.map(p => ({
            label: p.label,
            qty: p.quantity,
            unit: p.unitType,
            price: p.unitPrice,
        }));
    }, [dataset]);

    const cashRows: Row[] = useMemo(() => {
        if (!dataset) return [];
        return dataset.cashByCategory.map(c => ({
            label: c.category,
            qty: c.quantity,
            unit: c.unit,
            price: c.unitPrice,
        }));
    }, [dataset]);

    const laborRows: Row[] = useMemo(() => {
        if (!dataset) return [];
        return dataset.labor.map(l => ({
            label: l.stageLabel ?? (l.laborType === "contract" ? "Tenaga Kerja (Borongan)" : "Tenaga Kerja (Harian)"),
            amount: l.value,
        }));
    }, [dataset]);

    const toolRows: Row[] = useMemo(() => {
        if (!dataset) return [];
        return dataset.tools.map(t => ({
            label: t.toolName,
            qty: t.quantity,
            unit: null,
            price: t.purchasePrice,
        }));
    }, [dataset]);

    const extrasRows: Row[] = useMemo(() => {
        if (!dataset) return [];
        return dataset.extras.map(e => ({
            label: e.label,
            amount: e.amount,
        }));
    }, [dataset]);

    // Aggregates
    const totalProduction = useMemo(() => productionRows.reduce((a, r) => a + rowValue(r), 0), [productionRows]);
    const totalCash = useMemo(() => cashRows.reduce((a, r) => a + rowValue(r), 0), [cashRows]);
    const totalLabor = useMemo(() => laborRows.reduce((a, r) => a + rowValue(r), 0), [laborRows]);
    const totalTools = useMemo(() => toolRows.reduce((a, r) => a + rowValue(r), 0), [toolRows]);
    const totalExtras = useMemo(() => extrasRows.reduce((a, r) => a + rowValue(r), 0), [extrasRows]);
    const totalNonCash = totalLabor + totalTools + totalExtras;
    const totalCost = totalCash + totalNonCash;

    const revenueCash = totalProduction - totalCash;
    const revenueTotal = totalProduction - totalCost;
    const rcCash = totalCash > 0 ? totalProduction / totalCash : 0;
    const rcTotal = totalCost > 0 ? totalProduction / totalCost : 0;

    const onShare = async () => {
        const d = await buildDataset({
            landFactor,
            standardDailyWage: parseFloat((standardDailyWage || "0").replace(",", ".")) || 0,
        });
        const lines = [
            `Report Usahatani (${currentSeason ? `Musim Ke-${currentSeason.season_no}` : "–"}${year === "all" ? "" : ` | ${year}`})`,
            `Luas (konversi): ${targetArea} Ha | Luas saat ini: ${currentArea} Ha | Faktor: ${landFactor.toFixed(2)}`,
            `Total Penerimaan: ${currency(d.totalReceipts)}`,
            `Total Biaya Tunai: ${currency(d.totalCash)}`,
            `Total Tenaga Kerja (Non Tunai): ${currency(d.totalLabor)}`,
            `Total Alat (Non Tunai): ${currency(d.totalTools)}`,
            `Total Biaya Lain (Non Tunai): ${currency(d.totalExtras)}`,
            `Total Biaya Non Tunai: ${currency(d.totalNonCash)}`,
            `Total Biaya: ${currency(d.totalCost)}`,
            `Pendapatan Atas Biaya Tunai: ${currency(d.totalReceipts - d.totalCash)}`,
            `Pendapatan Atas Biaya Total: ${currency(d.totalReceipts - d.totalCost)}`,
            `R/C Tunai: ${(d.totalCash > 0 ? d.totalReceipts / d.totalCash : 0).toFixed(2)}`,
            `R/C Total: ${(d.totalCost > 0 ? d.totalReceipts / d.totalCost : 0).toFixed(2)}`,
        ].join("\n");
        try {
            await Share.share({ message: lines });
        } catch (e) {
            console.log(e);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: S.spacing.xl }}>
                {/* Header + share */}
                <LinearGradient
                    colors={[C.gradientFrom, C.gradientTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
                >
                    <View style={styles.headerRow}>
                        <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Report
                        </Text>
                        <Pressable
                            onPress={onShare}
                            style={({ pressed }) => [
                                styles.iconBtn,
                                { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                            ]}
                        >
                            <Ionicons name="share-social-outline" size={18} color={C.text} />
                        </Pressable>
                    </View>

                    {/* Filter chips (musim/tahun eksklusif di UI-mu) */}
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                        {/* Musim */}
                        <View style={{ flex: 1 }}>
                            <Pressable
                                onPress={() => { setOpenSeason(v => !v); setOpenYear(false); }}
                                style={({ pressed }) => [
                                    styles.chip,
                                    { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.96 : 1 },
                                ]}
                            >
                                <Ionicons name="leaf-outline" size={14} color={C.textMuted} />
                                <Text style={[styles.chipText, { color: C.text }]}>
                                    {currentSeason ? `Musim Ke-${currentSeason.season_no}` : "Pilih Musim"}
                                </Text>
                                <Ionicons name={openSeason ? "chevron-up" : "chevron-down"} size={14} color={C.icon} />
                            </Pressable>
                            {openSeason && (
                                <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                                    {seasons.map((s) => (
                                        <Pressable
                                            key={s.id}
                                            onPress={() => { setSeasonId(s.id); setOpenSeason(false); }}
                                            style={({ pressed }) => [
                                                styles.dropItem,
                                                {
                                                    backgroundColor: s.id === seasonId ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                                                    opacity: pressed ? 0.95 : 1,
                                                },
                                            ]}
                                        >
                                            <Text style={{ color: C.text, fontWeight: (s.id === seasonId ? "800" : "600") as any }}>
                                                Musim Ke-{s.season_no}
                                            </Text>
                                            <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                                {new Date(s.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} —{" "}
                                                {new Date(s.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Tahun */}
                        <View style={{ flex: 1 }}>
                            <Pressable
                                onPress={() => { setOpenYear(v => !v); setOpenSeason(false); }}
                                style={({ pressed }) => [
                                    styles.chip,
                                    { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.96 : 1 },
                                ]}
                            >
                                <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
                                <Text style={[styles.chipText, { color: C.text }]}>{year === "all" ? "Semua Tahun" : year}</Text>
                                <Ionicons name={openYear ? "chevron-up" : "chevron-down"} size={14} color={C.icon} />
                            </Pressable>
                            {openYear && (
                                <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                                    <Pressable
                                        onPress={() => { setYear("all"); setOpenYear(false); }}
                                        style={({ pressed }) => [styles.dropItem, { opacity: pressed ? 0.95 : 1 }]}
                                    >
                                        <Text style={{ color: C.text, fontWeight: (year === "all" ? "800" : "600") as any }}>
                                            Semua Tahun
                                        </Text>
                                    </Pressable>
                                    {(yearOptions || []).map((y) => (
                                        <Pressable
                                            key={y}
                                            onPress={() => { setYear(y); setOpenYear(false); }}
                                            style={({ pressed }) => [styles.dropItem, { opacity: pressed ? 0.95 : 1 }]}
                                        >
                                            <Text style={{ color: C.text, fontWeight: ((year === y ? "800" : "600") as any) }}>{y}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                {/* ===== Konten ===== */}
                <View style={{ paddingHorizontal: S.spacing.lg }}>
                    {/* Card parameter konversi & upah standar */}
                    <View
                        style={[
                            styles.card,
                            { borderColor: C.border, backgroundColor: C.surface, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Parameter Perhitungan
                        </Text>

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                            <LabeledInput
                                C={C}
                                icon="expand-outline"
                                label="Luas Saat Ini (Ha)"
                                value={currentArea}
                                onChangeText={setCurrentArea}
                                keyboardType="decimal-pad"
                            />
                            <LabeledInput
                                C={C}
                                icon="expand-outline"
                                label="Luas Konversi (Ha)"
                                value={targetArea}
                                onChangeText={setTargetArea}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                            <LabeledInput
                                C={C}
                                icon="cash-outline"
                                label="Upah Harian Standar (opsional)"
                                value={standardDailyWage}
                                onChangeText={setStandardDailyWage}
                                keyboardType="decimal-pad"
                            />
                            <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 4 }}>
                                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                    Faktor Konversi: <Text style={{ color: C.text, fontWeight: "800" as any }}>{landFactor.toFixed(2)}</Text>
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* PRODUKSI */}
                    <Section title="Produksi" rows={productionRows} C={C} scheme={scheme} />
                    <TotalsRow label="Total Penerimaan" value={totalProduction} C={C} bold />

                    {/* BIAYA TUNAI */}
                    <Section title="Biaya Produksi" subtitle="I. Biaya Tunai (per Kategori)" rows={cashRows} C={C} scheme={scheme} />
                    <TotalsRow label="Total Biaya Tunai" value={totalCash} C={C} />

                    {/* NON TUNAI - TK */}
                    <Section subtitle="II.a. Biaya Non Tunai — Tenaga Kerja" rows={laborRows} C={C} scheme={scheme} />
                    <TotalsRow label="Total Tenaga Kerja" value={totalLabor} C={C} />

                    {/* NON TUNAI - Alat */}
                    <Section subtitle="II.b. Biaya Non Tunai — Alat" rows={toolRows} C={C} scheme={scheme} />
                    <TotalsRow label="Total Alat" value={totalTools} C={C} />

                    {/* NON TUNAI - Biaya Lain */}
                    <Section subtitle="II.c. Biaya Non Tunai — Biaya Lain" rows={extrasRows} C={C} scheme={scheme} />
                    <TotalsRow label="Total Biaya Lain (Non Tunai)" value={totalExtras} C={C} />

                    {/* Total */}
                    <TotalsRow label="Total Biaya Non Tunai" value={totalNonCash} C={C} />
                    <TotalsRow label="Total Biaya" value={totalCost} C={C} bold />

                    {/* Pendapatan */}
                    <View style={{ height: 8 }} />
                    <Text style={[styles.sectionTitle, { color: C.text }]}>Pendapatan</Text>
                    <SimpleRow label="Pendapatan Atas Biaya Tunai" value={revenueCash} C={C} />
                    <SimpleRow label="Pendapatan Atas Biaya Total" value={revenueTotal} C={C} />
                    <SimpleRow label="R/C Biaya Tunai" valueStr={rcCash.toFixed(2)} C={C} />
                    <SimpleRow label="R/C Biaya Total" valueStr={rcTotal.toFixed(2)} C={C} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/** ===== Reusable components (mudah dipindah file) ===== */

function LabeledInput({
    C, icon, label, value, onChangeText, keyboardType = "default",
}: {
    C: Theme;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    onChangeText: (s: string) => void;
    keyboardType?: "default" | "decimal-pad" | "numeric";
}) {
    return (
        <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
            <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
                <Ionicons name={icon} size={16} color={C.textMuted} />
                <TextInput
                    placeholder={label}
                    placeholderTextColor={C.icon}
                    keyboardType={keyboardType}
                    value={value}
                    onChangeText={onChangeText}
                    style={[styles.input, { color: C.text, fontFamily: Fonts.sans as any }]}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                />
            </View>
        </View>
    );
}

function Section({
    title,
    subtitle,
    rows,
    C,
    scheme,
}: {
    title?: string;
    subtitle?: string;
    rows: Row[];
    C: Theme;
    scheme: "light" | "dark";
}) {
    return (
        <View
            style={[
                styles.card,
                { borderColor: C.border, backgroundColor: C.surface, borderRadius: Tokens.radius.lg },
                scheme === "light" ? Tokens.shadow.light : Tokens.shadow.dark,
            ]}
        >
            {title && <Text style={[styles.title, { color: C.text }]}>{title}</Text>}
            {subtitle && <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text>}

            {/* Header kolom */}
            <View
                style={[
                    styles.tableHeader,
                    { borderColor: C.border, backgroundColor: scheme === "light" ? C.surfaceSoft : C.surface },
                ]}
            >
                <Text style={[styles.th, { color: C.textMuted }]}>Uraian</Text>
                <Text style={[styles.thSmall, { color: C.textMuted }]}>Jumlah</Text>
                <Text style={[styles.thSmall, { color: C.textMuted }]}>Satuan</Text>
                <Text style={[styles.thSmall, { color: C.textMuted }]}>Harga</Text>
                <Text style={[styles.thRight, { color: C.textMuted }]}>Nilai</Text>
            </View>

            {/* Rows */}
            {rows.map((r, idx) => {
                const v = rowValue(r);
                const isAmount = typeof (r as any).amount === "number";
                return (
                    <View key={`${r.label}-${idx}`} style={[styles.tr, { borderColor: C.border }]}>
                        <Text style={[styles.td, { color: C.text }]}>{r.label}</Text>
                        <Text style={[styles.tdSmall, { color: C.text }]}>{isAmount ? "-" : (r as any).qty ?? "-"}</Text>
                        <Text style={[styles.tdSmall, { color: C.text }]}>{isAmount ? "-" : (r as any).unit ?? "-"}</Text>
                        <Text style={[styles.tdSmall, { color: C.text }]}>
                            {isAmount ? "-" : (r as any).price != null ? currency((r as any).price) : "-"}
                        </Text>
                        <Text style={[styles.tdRight, { color: C.text }]}>{currency(v)}</Text>
                    </View>
                );
            })}
        </View>
    );
}

function TotalsRow({ label, value, C, bold }: { label: string; value: number; C: Theme; bold?: boolean }) {
    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
            <Text style={{ color: C.text, fontWeight: (bold ? "900" : "800") as any }}>{label}</Text>
            <Text style={{ color: C.text, fontWeight: (bold ? "900" : "800") as any }}>{currency(value)}</Text>
        </View>
    );
}

function SimpleRow({ label, value, valueStr, C }: { label: string; value?: number; valueStr?: string; C: Theme }) {
    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
            <Text style={{ color: C.text }}>{label}</Text>
            <Text style={{ color: C.text, fontWeight: "800" as any }}>{valueStr ?? currency(value || 0)}</Text>
        </View>
    );
}

/** ===== Styles ===== */
const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },

    chip: {
        flexDirection: "row", alignItems: "center", gap: 6,
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    },
    chipText: { fontSize: 12, fontWeight: "800" },
    dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 8 },
    dropItem: { paddingHorizontal: 12, paddingVertical: 10 },

    card: { marginTop: 16, padding: 12, borderWidth: 1 },
    title: { fontSize: 16, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2, marginBottom: 8 },

    inputWrap: {
        flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 10,
    },
    input: { flex: 1, paddingVertical: 10, fontSize: 13 },

    tableHeader: {
        flexDirection: "row", alignItems: "center",
        borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginTop: 10,
    },
    th: { flex: 1.6, fontSize: 11, fontWeight: "800" },
    thSmall: { flex: 1, fontSize: 11, fontWeight: "800" },
    thRight: { width: 90, fontSize: 11, fontWeight: "800", textAlign: "right" },

    tr: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1,
    },
    td: { flex: 1.6, fontSize: 13 },
    tdSmall: { flex: 1, fontSize: 13 },
    tdRight: { width: 110, fontSize: 13, textAlign: "right", fontWeight: "800" },

    sectionTitle: { fontSize: 14, fontWeight: "800", marginTop: 12 },
});

import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

type Row = { label: string; qty?: number; unit?: string; price?: number };
type Season = { id: string; name: string; years: number[] };

const SEASONS: Season[] = [
    { id: "s1", name: "Musim 1", years: [2025, 2026] },
    { id: "s2", name: "Musim 2", years: [2026] },
];

const PRODUCTION: Row[] = [
    { label: "Penerimaan (hasil panen)", qty: 3800, unit: "kg", price: 1500 },
];

const CASH_COSTS: Row[] = [
    { label: "Benih", qty: 60, unit: "kg", price: 50000 },
    { label: "Pupuk Urea", qty: 150, unit: "kg", price: 6000 },
    { label: "Pestisida", qty: 6, unit: "ltr", price: 75000 },
    { label: "Sewa Lahan", price: 3000000 },
    { label: "Transportasi", price: 750000 },
];

const NONCASH_COSTS: Row[] = [
    { label: "TK Dalam Keluarga", qty: 40, unit: "HOK", price: 90000 },
    { label: "Alat", price: 600000 },
];

/** Format helpers */
const money = (n: number) =>
    n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const fmtQty = (q?: number, u?: string) => (q != null ? `${q} ${u ?? ""}`.trim() : "-");

/** Hitung nilai baris per hektar × ha */
const rowValue = (r: Row, ha: number) => {
    if (r.qty != null && r.price != null) return r.qty * r.price * ha;
    if (r.price != null) return r.price * ha;
    return 0;
};

export default function ReportScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    /** Filter state */
    const [seasonIdx, setSeasonIdx] = useState(0);
    const [openSeason, setOpenSeason] = useState(false);

    const season = SEASONS[seasonIdx];
    const [year, setYear] = useState<number>(season.years[0]);
    const [openYear, setOpenYear] = useState(false);

    /** Luas lahan (Ha) */
    const [hectare, setHectare] = useState<string>("1");

    /** Perhitungan */
    const ha = useMemo(() => {
        const n = parseFloat((hectare || "").replace(",", "."));
        return Number.isFinite(n) && n > 0 ? n : 0;
    }, [hectare]);

    const totalProduction = useMemo(
        () => PRODUCTION.reduce((a, r) => a + rowValue(r, ha), 0),
        [ha]
    );
    const totalCash = useMemo(
        () => CASH_COSTS.reduce((a, r) => a + rowValue(r, ha), 0),
        [ha]
    );
    const totalNonCash = useMemo(
        () => NONCASH_COSTS.reduce((a, r) => a + rowValue(r, ha), 0),
        [ha]
    );
    const totalCost = totalCash + totalNonCash;
    const revenueCash = totalProduction - totalCash;
    const revenueTotal = totalProduction - totalCost;
    const rcCash = totalCash > 0 ? totalProduction / totalCash : 0;
    const rcTotal = totalCost > 0 ? totalProduction / totalCost : 0;

    /** Share */
    const onShare = async () => {
        const lines = [
            `Report Usahatani (${season.name} | ${year})`,
            `Luas lahan: ${ha} Ha`,
            `Total Penerimaan: ${money(totalProduction)}`,
            `Total Biaya Tunai: ${money(totalCash)}`,
            `Total Biaya Non Tunai: ${money(totalNonCash)}`,
            `Total Biaya: ${money(totalCost)}`,
            `Pendapatan Atas Biaya Tunai: ${money(revenueCash)}`,
            `Pendapatan Atas Biaya Total: ${money(revenueTotal)}`,
            `R/C Tunai: ${rcCash.toFixed(2)}`,
            `R/C Total: ${rcTotal.toFixed(2)}`,
        ].join("\n");
        try {
            await Share.share({ message: lines });
        } catch (e) {
            console.log(e);
        }
    };

    const reset = () => {
        setHectare("1");
        Keyboard.dismiss();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: S.spacing.xl }}>
                {/* ===== Header gradient + back + share */}
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

                    {/* Baris filter (chip) */}
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
                                <Text style={[styles.chipText, { color: C.text }]}>{season.name}</Text>
                                <Ionicons name={openSeason ? "chevron-up" : "chevron-down"} size={14} color={C.icon} />
                            </Pressable>
                            {openSeason && (
                                <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                                    {SEASONS.map((s, i) => (
                                        <Pressable
                                            key={s.id}
                                            onPress={() => { setSeasonIdx(i); setOpenSeason(false); setYear(s.years[0]); }}
                                            style={({ pressed }) => [
                                                styles.dropItem,
                                                { backgroundColor: i === seasonIdx ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent", opacity: pressed ? 0.95 : 1 },
                                            ]}
                                        >
                                            <Text style={{ color: C.text, fontWeight: i === seasonIdx ? "800" as any : "600" as any }}>
                                                {s.name}
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
                                <Text style={[styles.chipText, { color: C.text }]}>{year}</Text>
                                <Ionicons name={openYear ? "chevron-up" : "chevron-down"} size={14} color={C.icon} />
                            </Pressable>
                            {openYear && (
                                <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                                    {season.years.map((y) => (
                                        <Pressable
                                            key={y}
                                            onPress={() => { setYear(y); setOpenYear(false); }}
                                            style={({ pressed }) => [styles.dropItem, { opacity: pressed ? 0.95 : 1 }]}
                                        >
                                            <Text style={{ color: C.text, fontWeight: y === year ? "800" as any : "600" as any }}>{y}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                {/* ===== Konten ===== */}
                <View style={{ paddingHorizontal: S.spacing.lg }}>
                    {/* Keterangan per Ha */}
                    <View
                        style={[
                            styles.card,
                            { borderColor: C.border, backgroundColor: C.surface, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Tabel Analisis Usahatani per {ha || 0} Ha
                        </Text>

                        {/* Input luas lahan */}
                        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                            <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
                                <Ionicons name="expand-outline" size={16} color={C.textMuted} />
                                <TextInput
                                    placeholder="Masukkan Ukuran Lahan (Ha)"
                                    placeholderTextColor={C.icon}
                                    keyboardType="decimal-pad"
                                    value={hectare}
                                    onChangeText={setHectare}
                                    style={[styles.input, { color: C.text, fontFamily: Fonts.sans as any }]}
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                            </View>

                            <Pressable
                                onPress={reset}
                                style={({ pressed }) => [
                                    styles.resetBtn,
                                    { backgroundColor: C.danger, opacity: pressed ? 0.95 : 1, borderRadius: S.radius.md },
                                ]}
                            >
                                <Ionicons name="refresh-outline" size={16} color="#fff" />
                                <Text style={[styles.resetText, { fontFamily: Fonts.rounded as any }]}>Reset</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* PRODUKSI */}
                    <Section
                        title="Produksi"
                        rows={PRODUCTION}
                        ha={ha}
                        C={C}
                        S={S}
                        scheme={scheme}
                    />

                    {/* Biaya Produksi */}
                    <Section title="Biaya Produksi" subtitle="I. Biaya Tunai" rows={CASH_COSTS} ha={ha} C={C} S={S} scheme={scheme} />
                    <TotalsRow label="Total Biaya Tunai" value={CASH_COSTS.reduce((a, r) => a + rowValue(r, ha), 0)} C={C} />

                    <Section subtitle="II. Biaya Non Tunai" rows={NONCASH_COSTS} ha={ha} C={C} S={S} scheme={scheme} />
                    <TotalsRow label="Total Biaya Non Tunai" value={NONCASH_COSTS.reduce((a, r) => a + rowValue(r, ha), 0)} C={C} />

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

/** ====== Subcomponents ====== */

function Section({
    title,
    subtitle,
    rows,
    ha,
    C,
    S,
    scheme,
}: {
    title?: string;
    subtitle?: string;
    rows: Row[];
    ha: number;
    C: typeof Colors.light;
    S: typeof Tokens;
    scheme: "light" | "dark";
}) {
    return (
        <View
            style={[
                styles.card,
                { borderColor: C.border, backgroundColor: C.surface, borderRadius: S.radius.lg },
                scheme === "light" ? S.shadow.light : S.shadow.dark,
            ]}
        >
            {title && <Text style={[styles.title, { color: C.text }]}>{title}</Text>}
            {subtitle && <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text>}

            {/* Header kolom */}
            <View style={[styles.tableHeader, { borderColor: C.border, backgroundColor: scheme === "light" ? C.surfaceSoft : C.surface }]}>
                <Text style={[styles.th, { color: C.textMuted }]}>Uraian</Text>
                <Text style={[styles.thSmall, { color: C.textMuted }]}>Jumlah</Text>
                <Text style={[styles.thSmall, { color: C.textMuted }]}>Satuan</Text>
                <Text style={[styles.thSmall, { color: C.textMuted }]}>Harga</Text>
                <Text style={[styles.thRight, { color: C.textMuted }]}>Nilai</Text>
            </View>

            {/* Rows */}
            {rows.map((r, idx) => {
                const value = rowValue(r, ha);
                return (
                    <View key={`${r.label}-${idx}`} style={[styles.tr, { borderColor: C.border }]}>
                        <Text style={[styles.td, { color: C.text }]}>{r.label}</Text>
                        <Text style={[styles.tdSmall, { color: C.text }]}>{r.qty ?? "-"}</Text>
                        <Text style={[styles.tdSmall, { color: C.text }]}>{r.unit ?? "-"}</Text>
                        <Text style={[styles.tdSmall, { color: C.text }]}>{r.price ? money(r.price) : "-"}</Text>
                        <Text style={[styles.tdRight, { color: C.text }]}>{money(value)}</Text>
                    </View>
                );
            })}
        </View>
    );
}

function TotalsRow({ label, value, C, bold }: { label: string; value: number; C: typeof Colors.light; bold?: boolean }) {
    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
            <Text style={{ color: C.text, fontWeight: (bold ? "900" : "800") as any }}>{label}</Text>
            <Text style={{ color: C.text, fontWeight: (bold ? "900" : "800") as any }}>{money(value)}</Text>
        </View>
    );
}

function SimpleRow({ label, value, valueStr, C }: { label: string; value?: number; valueStr?: string; C: typeof Colors.light }) {
    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
            <Text style={{ color: C.text }}>{label}</Text>
            <Text style={{ color: C.text, fontWeight: "800" as any }}>{valueStr ?? money(value || 0)}</Text>
        </View>
    );
}

/** ====== Styles ====== */
const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: {
        width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center",
    },

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
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
    },
    input: { flex: 1, paddingVertical: 10, fontSize: 13 },
    resetBtn: { paddingHorizontal: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
    resetText: { color: "#fff", fontWeight: "800", fontSize: 13 },

    tableHeader: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginTop: 10,
    },
    th: { flex: 1.6, fontSize: 11, fontWeight: "800" },
    thSmall: { flex: 0.7, fontSize: 11, fontWeight: "800" },
    thRight: { width: 110, fontSize: 11, fontWeight: "800", textAlign: "right" },

    tr: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
    },
    td: { flex: 1.6, fontSize: 13 },
    tdSmall: { flex: 0.7, fontSize: 13 },
    tdRight: { width: 110, fontSize: 13, textAlign: "right", fontWeight: "800" },
});

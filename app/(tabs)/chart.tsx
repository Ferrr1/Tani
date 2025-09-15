// app/analytics/index.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from "react-native";
import PieChart from "react-native-pie-chart";
import { SafeAreaView } from "react-native-safe-area-context";

/** ===== Dummy data (gampang diganti API) ===== */
type Season = { id: string; name: string; start: string; end: string };
type Txn = {
    id: string;
    type: "income" | "expense";
    amount: number;
    date: string;
    seasonId: string;
};

const SEASONS: Season[] = [
    { id: "s1", name: "Musim 1", start: "2025-02-01", end: "2025-11-30" },
    { id: "s2", name: "Musim 2", start: "2026-02-01", end: "2026-11-30" },
];

const TXNS: Txn[] = [
    // s1 - 2025
    { id: "t1", type: "income", amount: 120000, date: "2025-02-10", seasonId: "s1" },
    { id: "t2", type: "expense", amount: 50000, date: "2025-02-12", seasonId: "s1" },
    { id: "t3", type: "income", amount: 150000, date: "2025-03-18", seasonId: "s1" },
    { id: "t4", type: "expense", amount: 70000, date: "2025-03-03", seasonId: "s1" },
    { id: "t5", type: "income", amount: 300000, date: "2025-07-01", seasonId: "s1" },
    { id: "t6", type: "expense", amount: 120000, date: "2025-07-07", seasonId: "s1" },
    // s2 - 2026
    { id: "t7", type: "income", amount: 180000, date: "2026-03-12", seasonId: "s2" },
    { id: "t8", type: "expense", amount: 60000, date: "2026-03-16", seasonId: "s2" },
    { id: "t9", type: "income", amount: 260000, date: "2026-08-09", seasonId: "s2" },
    { id: "t10", type: "expense", amount: 100000, date: "2026-08-22", seasonId: "s2" },
];

/** ===== Util ===== */
const money = (n: number) =>
    n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const getYear = (iso: string) => new Date(iso).getFullYear();

/** ===== Screen ===== */
export default function ChartScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;

    // filter
    const [seasonIdx, setSeasonIdx] = useState(0);
    const [year, setYear] = useState<number | "all">("all");
    const [openSeason, setOpenSeason] = useState(false);
    const [openYear, setOpenYear] = useState(false);

    const season = SEASONS[seasonIdx];

    const yearOptions = useMemo(() => {
        const ys = Array.from(
            new Set(TXNS.filter((t) => t.seasonId === season.id).map((t) => getYear(t.date)))
        ).sort();
        return ys;
    }, [seasonIdx]);

    // data terfilter
    const filtered = useMemo(() => {
        return TXNS.filter(
            (t) => t.seasonId === season.id && (year === "all" ? true : getYear(t.date) === year)
        );
    }, [season.id, year]);

    // agregasi (income & expense) + per bulan (kalau nanti mau dipakai lagi)
    const { totalIn, totalOut } = useMemo(() => {
        const inc = Array(12).fill(0);
        const exp = Array(12).fill(0);
        for (const t of filtered) {
            const m = new Date(t.date).getMonth();
            if (t.type === "income") inc[m] += t.amount;
            else exp[m] += t.amount;
        }
        return {
            byMonthIncome: inc,
            byMonthExpense: exp,
            totalIn: inc.reduce((a, b) => a + b, 0),
            totalOut: exp.reduce((a, b) => a + b, 0),
        };
    }, [filtered]);

    /** ===== Pie sizing ===== */
    const chartWidth = Dimensions.get("window").width - S.spacing.lg * 2;
    const pieSize = Math.min(chartWidth - 24, 280); // sedikit padding kiri/kanan

    const total = totalIn + totalOut;
    const pctIn = total > 0 ? Math.round((totalIn / total) * 100) : 0;
    const pctOut = total > 0 ? 100 - pctIn : 0;
    const seriesData = [
        { value: totalIn, color: C.success }, // penerimaan
        { value: totalOut, color: C.danger },  // pengeluaran
    ];
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: S.spacing.xl }}>
                {/* Header gradient + back */}
                <LinearGradient
                    colors={[C.gradientFrom, C.gradientTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
                >
                    <View style={styles.headerRow}>
                        <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Grafik
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>

                    {/* Filter pills */}
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                        {/* Musim */}
                        <View style={{ flex: 1 }}>
                            <Pressable
                                onPress={() => {
                                    setOpenSeason((v) => !v);
                                    setOpenYear(false);
                                }}
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
                                            onPress={() => {
                                                setSeasonIdx(i);
                                                setOpenSeason(false);
                                            }}
                                            style={({ pressed }) => [
                                                styles.dropItem,
                                                {
                                                    backgroundColor:
                                                        i === seasonIdx ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                                                    opacity: pressed ? 0.95 : 1,
                                                },
                                            ]}
                                        >
                                            <Text style={{ color: C.text, fontWeight: (i === seasonIdx ? "800" : "600") as any }}>
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
                                onPress={() => {
                                    setOpenYear((v) => !v);
                                    setOpenSeason(false);
                                }}
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
                                        onPress={() => {
                                            setYear("all");
                                            setOpenYear(false);
                                        }}
                                        style={({ pressed }) => [styles.dropItem, { opacity: pressed ? 0.95 : 1 }]}
                                    >
                                        <Text style={{ color: C.text, fontWeight: (year === "all" ? "800" : "600") as any }}>
                                            Semua Tahun
                                        </Text>
                                    </Pressable>
                                    {yearOptions.map((y) => (
                                        <Pressable
                                            key={y}
                                            onPress={() => {
                                                setYear(y);
                                                setOpenYear(false);
                                            }}
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

                <View style={{ paddingHorizontal: S.spacing.lg }}>
                    {/* Ringkasan */}
                    <View
                        style={[
                            styles.summary,
                            { borderColor: C.border, backgroundColor: C.surface, borderRadius: S.radius.lg },
                        ]}
                    >
                        <View style={styles.summaryItem}>
                            <Ionicons name="arrow-down-circle-outline" size={18} color={C.success} />
                            <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Penerimaan</Text>
                            <Text style={[styles.summaryValue, { color: C.text }]}>{money(totalIn)}</Text>
                        </View>
                        <View style={[styles.sep, { backgroundColor: C.border }]} />
                        <View style={styles.summaryItem}>
                            <Ionicons name="arrow-up-circle-outline" size={18} color={C.danger} />
                            <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Pengeluaran</Text>
                            <Text style={[styles.summaryValue, { color: C.text }]}>{money(totalOut)}</Text>
                        </View>
                        <View style={[styles.sep, { backgroundColor: C.border }]} />
                        <View style={styles.summaryItem}>
                            <Ionicons name="cash-outline" size={18} color={C.tint} />
                            <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Bersih</Text>
                            <Text style={[styles.summaryValue, { color: C.text }]}>{money(totalIn - totalOut)}</Text>
                        </View>
                    </View>

                    {/* Kartu Chart (Pie) */}
                    <View
                        style={[
                            styles.chartCard,
                            { borderColor: C.border, backgroundColor: C.surface, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <Text style={[styles.chartTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Komposisi ({season.name}
                            {year === "all" ? "" : ` • ${year}`})
                        </Text>

                        {total === 0 ? (
                            <View style={{ paddingVertical: 24, alignItems: "center" }}>
                                <Text style={{ color: C.textMuted }}>Belum ada data untuk filter ini.</Text>
                            </View>
                        ) : (
                            <View style={{ alignItems: "center", gap: 12 }}>
                                <PieChart
                                    widthAndHeight={pieSize}
                                    series={seriesData}
                                // Donut? tinggal aktifkan salah satu dari dua gaya di bawah:

                                // 1) Donut transparan:
                                // cover={0.6}

                                // 2) Donut berwarna (matching surface):
                                // cover={{ radius: 0.6, color: C.surface }}

                                // (opsional kecil) beri jarak antar slice:
                                // padAngle={0.01}
                                />
                                <Text style={{ color: C.textMuted }}>
                                    {pctIn}% Penerimaan | {pctOut}% Pengeluaran
                                </Text>
                            </View>
                        )}

                        {/* Legend */}
                        <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.success }} />
                                <Text style={{ color: C.textMuted, fontSize: 12 }}>Penerimaan</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.danger }} />
                                <Text style={{ color: C.textMuted, fontSize: 12 }}>Pengeluaran</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/** ===== Styles ===== */
const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    chipText: { fontSize: 12, fontWeight: "800" },
    dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 8 },
    dropItem: { paddingHorizontal: 12, paddingVertical: 10 },

    summary: {
        marginTop: 16,
        padding: 12,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    summaryItem: { flex: 1, gap: 4 },
    summaryLabel: { fontSize: 11, fontWeight: "700" },
    summaryValue: { fontSize: 14, fontWeight: "800" },
    sep: { width: 1, height: 32, opacity: 0.6 },

    chartCard: { marginTop: 16, padding: 12, borderWidth: 1 },
    chartTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
});
